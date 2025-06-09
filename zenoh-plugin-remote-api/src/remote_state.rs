//
// Copyright (c) 2024 ZettaScale Technology
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License 2.0 which is available at
// http://www.eclipse.org/legal/epl-2.0, or the Apache License, Version 2.0
// which is available at https://www.apache.org/licenses/LICENSE-2.0.
//
// SPDX-License-Identifier: EPL-2.0 OR Apache-2.0
//
// Contributors:
//   ZettaScale Zenoh Team, <zenoh@zettascale.tech>
//

//! ⚠️ WARNING ⚠️
//!
//! This crate is intended for Zenoh's internal use.
//!
//! [Click here for Zenoh's documentation](../zenoh/index.html)

use std::{
    collections::HashMap,
    sync::{atomic::AtomicU32, Arc, Mutex},
    time::Duration,
};

use flume::Sender;
use lru::LruCache;
use zenoh::{
    handlers::CallbackDrop,
    liveliness::LivelinessToken,
    pubsub::{Publisher, Subscriber},
    query::{Querier, Query, Queryable, Reply, Selector},
    Session,
};
use zenoh_result::bail;

use crate::{
    interface::{
        self, DeclareLivelinessSubscriber, DeclareLivelinessToken, DeclarePublisher,
        DeclareQuerier, DeclareQueryable, DeclareSubscriber, Delete, Get, LivelinessGet, PingAck,
        PublisherDelete, PublisherPut, Put, QuerierGet, QueryResponseFinal, ReplyDel, ReplyErr,
        ReplyOk, ResponseSessionInfo, ResponseTimestamp, UndeclareLivelinessSubscriber,
        UndeclareLivelinessToken, UndeclarePublisher, UndeclareQuerier, UndeclareQueryable,
        UndeclareSubscriber,
    },
    AdminSpaceClient, InRemoteMessage, OutRemoteMessage, SequenceId,
};

// Since we do not have api to get query timeout
// we do not have possibility to understand when a stale query should be dropped
// so to make things simple we are going to use lru cache which would handle stale queries
// autmatically.

const MAX_NUM_PENDING_QUERIES: usize = 1000;
pub(crate) struct RemoteState {
    id: String,
    tx: Sender<(OutRemoteMessage, Option<SequenceId>)>,
    admin_client: Arc<Mutex<AdminSpaceClient>>,
    session: Session,
    subscribers: HashMap<u32, Subscriber<()>>,
    publishers: HashMap<u32, Publisher<'static>>,
    queryables: HashMap<u32, Queryable<()>>,
    pending_queries: Arc<Mutex<LruCache<u32, Query>>>,
    query_counter: Arc<AtomicU32>,
    liveliness_tokens: HashMap<u32, LivelinessToken>,
    liveliness_subscribers: HashMap<u32, Subscriber<()>>,
    queriers: HashMap<u32, Querier<'static>>,
}

impl RemoteState {
    pub(crate) fn new(
        tx: Sender<(OutRemoteMessage, Option<SequenceId>)>,
        admin_client: Arc<Mutex<AdminSpaceClient>>,
        session: Session,
    ) -> Self {
        let id = admin_client.lock().unwrap().id().to_string();
        Self {
            id,
            tx,
            admin_client,
            session,
            subscribers: HashMap::new(),
            publishers: HashMap::new(),
            queryables: HashMap::new(),
            pending_queries: Arc::new(Mutex::new(LruCache::new(
                MAX_NUM_PENDING_QUERIES.try_into().unwrap(),
            ))),
            query_counter: Arc::new(AtomicU32::new(0)),
            liveliness_tokens: HashMap::new(),
            liveliness_subscribers: HashMap::new(),
            queriers: HashMap::new(),
        }
    }

    pub(crate) async fn clear(&mut self) {
        let mut publishers = HashMap::new();
        std::mem::swap(&mut publishers, &mut self.publishers);
        for (_, publisher) in publishers {
            if let Err(e) = publisher.undeclare().await {
                tracing::error!("{e}")
            }
        }

        let mut subscribers = HashMap::new();
        std::mem::swap(&mut subscribers, &mut self.subscribers);

        for (_, subscriber) in subscribers {
            if let Err(e) = subscriber.undeclare().await {
                tracing::error!("{e}")
            }
        }

        let mut queryables = HashMap::new();
        std::mem::swap(&mut queryables, &mut self.queryables);
        for (_, queryable) in queryables {
            if let Err(e) = queryable.undeclare().await {
                tracing::error!("{e}")
            }
        }

        self.pending_queries.lock().as_mut().unwrap().clear();

        let mut liveliness_tokens = HashMap::new();
        std::mem::swap(&mut liveliness_tokens, &mut self.liveliness_tokens);
        for (_, token) in liveliness_tokens {
            if let Err(e) = token.undeclare().await {
                tracing::error!("{e}")
            }
        }

        let mut liveliness_subscribers = HashMap::new();
        std::mem::swap(
            &mut liveliness_subscribers,
            &mut self.liveliness_subscribers,
        );
        for (_, subscriber) in liveliness_subscribers {
            if let Err(e) = subscriber.undeclare().await {
                tracing::error!("{e}")
            }
        }

        if let Err(err) = self.session.close().await {
            tracing::error!("{err}")
        };
    }

    async fn declare_publisher(
        &mut self,
        declare_publisher: DeclarePublisher,
    ) -> Result<Option<OutRemoteMessage>, zenoh_result::Error> {
        if self.publishers.contains_key(&declare_publisher.id) {
            bail!(
                "Publisher with id: '{}' already exists",
                declare_publisher.id
            );
        }
        let publisher = self
            .session
            .declare_publisher(declare_publisher.keyexpr)
            .encoding(declare_publisher.encoding)
            .priority(declare_publisher.qos.priority())
            .congestion_control(declare_publisher.qos.congestion_control())
            .express(declare_publisher.qos.express())
            .allowed_destination(declare_publisher.qos.locality())
            .reliability(declare_publisher.qos.reliability())
            .await?;
        self.admin_client
            .lock()
            .unwrap()
            .register_publisher(declare_publisher.id, publisher.key_expr().as_str());
        self.publishers.insert(declare_publisher.id, publisher);
        Ok(None)
    }

    async fn undeclare_publisher(
        &mut self,
        undeclare_publisher: UndeclarePublisher,
    ) -> Result<Option<OutRemoteMessage>, zenoh_result::Error> {
        match self.publishers.remove(&undeclare_publisher.id) {
            Some(p) => {
                p.undeclare().await?;
                self.admin_client
                    .lock()
                    .unwrap()
                    .unregister_publisher(undeclare_publisher.id);
                Ok(None)
            }
            None => bail!(
                "Publisher with id {} does not exist",
                undeclare_publisher.id
            ),
        }
    }

    async fn declare_subscriber(
        &mut self,
        declare_subscriber: DeclareSubscriber,
    ) -> Result<Option<OutRemoteMessage>, zenoh_result::Error> {
        if self.subscribers.contains_key(&declare_subscriber.id) {
            bail!(
                "Subscriber with id: '{}' already exists",
                declare_subscriber.id
            );
        }
        let tx = self.tx.clone();
        let subscriber = self
            .session
            .declare_subscriber(declare_subscriber.keyexpr)
            .allowed_origin(declare_subscriber.allowed_origin)
            .callback(move |s| {
                let msg = interface::Sample {
                    subscriber_id: declare_subscriber.id,
                    sample: s,
                };
                let _ = tx.send((OutRemoteMessage::Sample(msg), None));
            })
            .await?;
        self.admin_client
            .lock()
            .unwrap()
            .register_subscriber(declare_subscriber.id, subscriber.key_expr().as_str());
        self.subscribers.insert(declare_subscriber.id, subscriber);
        Ok(None)
    }

    async fn undeclare_subscriber(
        &mut self,
        undeclare_subscriber: UndeclareSubscriber,
    ) -> Result<Option<OutRemoteMessage>, zenoh_result::Error> {
        match self.subscribers.remove(&undeclare_subscriber.id) {
            Some(s) => {
                s.undeclare().await?;
                self.admin_client
                    .lock()
                    .unwrap()
                    .unregister_subscriber(undeclare_subscriber.id);
                Ok(None)
            }
            None => bail!(
                "Subscriber with id {} does not exist",
                undeclare_subscriber.id
            ),
        }
    }

    async fn declare_queryable(
        &mut self,
        declare_queryable: DeclareQueryable,
    ) -> Result<Option<OutRemoteMessage>, zenoh_result::Error> {
        if self.queryables.contains_key(&declare_queryable.id) {
            bail!(
                "Queryable with id: '{}' already exists",
                declare_queryable.id
            );
        }
        let tx = self.tx.clone();
        let query_counter = self.query_counter.clone();
        let pending_queries = self.pending_queries.clone();

        let queryable = self
            .session
            .declare_queryable(declare_queryable.keyexpr)
            .complete(declare_queryable.complete)
            .allowed_origin(declare_queryable.allowed_origin)
            .callback(move |q| {
                let query_id = query_counter.fetch_add(1, std::sync::atomic::Ordering::SeqCst);
                let msg = interface::Query {
                    queryable_id: declare_queryable.id,
                    query_id,
                    query: q.clone(),
                };
                pending_queries.lock().unwrap().put(query_id, q);
                let _ = tx.send((OutRemoteMessage::Query(msg), None));
            })
            .await?;
        self.admin_client
            .lock()
            .unwrap()
            .register_queryable(declare_queryable.id, queryable.key_expr().as_str());
        self.queryables.insert(declare_queryable.id, queryable);
        Ok(None)
    }

    async fn undeclare_queryable(
        &mut self,
        undeclare_queryable: UndeclareQueryable,
    ) -> Result<Option<OutRemoteMessage>, zenoh_result::Error> {
        match self.queryables.remove(&undeclare_queryable.id) {
            Some(q) => {
                q.undeclare().await?;
                self.admin_client
                    .lock()
                    .unwrap()
                    .unregister_queryable(undeclare_queryable.id);
                Ok(None)
            }
            None => bail!(
                "Queryable with id {} does not exist",
                undeclare_queryable.id
            ),
        }
    }

    async fn declare_querier(
        &mut self,
        declare_querier: DeclareQuerier,
    ) -> Result<Option<OutRemoteMessage>, zenoh_result::Error> {
        if self.queriers.contains_key(&declare_querier.id) {
            bail!("Querier with id: '{}' already exists", declare_querier.id);
        }
        let querier = self
            .session
            .declare_querier(declare_querier.keyexpr)
            .priority(declare_querier.qos.priority())
            .congestion_control(declare_querier.qos.congestion_control())
            .express(declare_querier.qos.express())
            .allowed_destination(declare_querier.qos.locality())
            .accept_replies(declare_querier.query_settings.reply_keyexpr())
            .target(declare_querier.query_settings.target())
            .timeout(Duration::from_millis(declare_querier.timeout_ms as u64))
            .consolidation(declare_querier.query_settings.consolidation())
            .await?;
        self.admin_client
            .lock()
            .unwrap()
            .register_querier(declare_querier.id, querier.key_expr().as_str());
        self.queriers.insert(declare_querier.id, querier);
        Ok(None)
    }

    async fn undeclare_querier(
        &mut self,
        undeclare_querier: UndeclareQuerier,
    ) -> Result<Option<OutRemoteMessage>, zenoh_result::Error> {
        match self.queriers.remove(&undeclare_querier.id) {
            Some(q) => {
                q.undeclare().await?;
                self.admin_client
                    .lock()
                    .unwrap()
                    .unregister_querier(undeclare_querier.id);
                Ok(None)
            }
            None => bail!("Querier with id {} does not exist", undeclare_querier.id),
        }
    }

    async fn get_session_info(&self) -> OutRemoteMessage {
        let info = self.session.info();
        OutRemoteMessage::ResponseSessionInfo(ResponseSessionInfo {
            zid: info.zid().await,
            z_routers: info.routers_zid().await.collect(),
            z_peers: info.peers_zid().await.collect(),
        })
    }

    fn get_timestamp(&self) -> OutRemoteMessage {
        OutRemoteMessage::ResponseTimestamp(ResponseTimestamp {
            timestamp: self.session.new_timestamp(),
        })
    }

    async fn put(&self, put: Put) -> Result<(), zenoh_result::Error> {
        self.session
            .put(put.keyexpr, put.payload)
            .encoding(put.encoding)
            .attachment(put.attachment)
            .priority(put.qos.priority())
            .congestion_control(put.qos.congestion_control())
            .express(put.qos.express())
            .allowed_destination(put.qos.locality())
            .reliability(put.qos.reliability())
            .timestamp(put.timestamp)
            .await?;
        Ok(())
    }

    async fn delete(&self, delete: Delete) -> Result<(), zenoh_result::Error> {
        self.session
            .delete(delete.keyexpr)
            .attachment(delete.attachment)
            .priority(delete.qos.priority())
            .congestion_control(delete.qos.congestion_control())
            .express(delete.qos.express())
            .allowed_destination(delete.qos.locality())
            .reliability(delete.qos.reliability())
            .timestamp(delete.timestamp)
            .await?;
        Ok(())
    }

    async fn publisher_put(&self, publisher_put: PublisherPut) -> Result<(), zenoh_result::Error> {
        match self.publishers.get(&publisher_put.publisher_id) {
            Some(p) => {
                let mut pb = p
                    .put(publisher_put.payload)
                    .attachment(publisher_put.attachment)
                    .timestamp(publisher_put.timestamp);
                if let Some(encoding) = publisher_put.encoding {
                    pb = pb.encoding(encoding);
                }
                pb.await?;
                Ok(())
            }
            None => {
                bail!(
                    "Publisher with id {} does not exist",
                    publisher_put.publisher_id
                );
            }
        }
    }

    async fn publisher_delete(
        &self,
        publisher_delete: PublisherDelete,
    ) -> Result<(), zenoh_result::Error> {
        match self.publishers.get(&publisher_delete.publisher_id) {
            Some(p) => {
                p.delete()
                    .attachment(publisher_delete.attachment)
                    .timestamp(publisher_delete.timestamp)
                    .await?;
                Ok(())
            }
            None => {
                bail!(
                    "Publisher with id {} does not exist",
                    publisher_delete.publisher_id
                );
            }
        }
    }
    fn create_get_callback(&self, query_id: u32) -> CallbackDrop<impl Fn(Reply), impl FnMut()> {
        let tx1 = self.tx.clone();
        let tx2 = self.tx.clone();
        CallbackDrop {
            callback: move |reply: zenoh::query::Reply| {
                let msg = interface::Reply { query_id, reply };
                let _ = tx1.send((OutRemoteMessage::Reply(msg), None));
            },
            drop: move || {
                let msg = interface::QueryResponseFinal { query_id };
                let _ = tx2.send((OutRemoteMessage::QueryResponseFinal(msg), None));
            },
        }
    }

    async fn get(&self, get: Get) -> Result<(), zenoh_result::Error> {
        let selector: Selector = match !get.parameters.is_empty() {
            true => (get.keyexpr, get.parameters).into(),
            false => get.keyexpr.into(),
        };
        let mut gb = self.session.get(selector);
        if let Some(payload) = get.payload {
            gb = gb.payload(payload);
        }
        if let Some(attachment) = get.attachment {
            gb = gb.attachment(attachment);
        }
        if let Some(encoding) = get.encoding {
            gb = gb.encoding(encoding);
        }

        gb.accept_replies(get.query_settings.reply_keyexpr())
            .priority(get.qos.priority())
            .congestion_control(get.qos.congestion_control())
            .express(get.qos.express())
            .allowed_destination(get.qos.locality())
            .consolidation(get.query_settings.consolidation())
            .target(get.query_settings.target())
            .timeout(Duration::from_millis(get.timeout_ms as u64))
            .with(self.create_get_callback(get.id))
            .await?;
        Ok(())
    }

    async fn querier_get(&self, querier_get: QuerierGet) -> Result<(), zenoh_result::Error> {
        match self.queriers.get(&querier_get.querier_id) {
            Some(querier) => {
                let mut gb = querier.get();
                if let Some(payload) = querier_get.payload {
                    gb = gb.payload(payload);
                }
                if let Some(attachment) = querier_get.attachment {
                    gb = gb.attachment(attachment);
                }
                if let Some(encoding) = querier_get.encoding {
                    gb = gb.encoding(encoding);
                }
                if !querier_get.parameters.is_empty() {
                    gb = gb.parameters(querier_get.parameters);
                }

                gb.with(self.create_get_callback(querier_get.id)).await?;
                Ok(())
            }
            None => bail!("Querier with id {} does not exist", querier_get.id),
        }
    }

    async fn reply_ok(&self, reply_ok: ReplyOk) -> Result<(), zenoh_result::Error> {
        let q = self
            .pending_queries
            .lock()
            .unwrap()
            .get(&reply_ok.query_id)
            .cloned();

        match q {
            Some(q) => {
                q.reply(reply_ok.keyexpr, reply_ok.payload)
                    .attachment(reply_ok.attachment)
                    .encoding(reply_ok.encoding)
                    .priority(reply_ok.qos.priority())
                    .congestion_control(reply_ok.qos.congestion_control())
                    .express(reply_ok.qos.express())
                    .timestamp(reply_ok.timestamp)
                    .await?;
            }
            None => {
                bail!("Query with id {} does not exist", reply_ok.query_id);
            }
        }

        Ok(())
    }

    async fn reply_del(&self, reply_del: ReplyDel) -> Result<(), zenoh_result::Error> {
        let q = self
            .pending_queries
            .lock()
            .unwrap()
            .get(&reply_del.query_id)
            .cloned();

        match q {
            Some(q) => {
                q.reply_del(reply_del.keyexpr)
                    .attachment(reply_del.attachment)
                    .priority(reply_del.qos.priority())
                    .congestion_control(reply_del.qos.congestion_control())
                    .express(reply_del.qos.express())
                    .timestamp(reply_del.timestamp)
                    .await?;
            }
            None => {
                bail!("Query with id {} does not exist", reply_del.query_id);
            }
        }

        Ok(())
    }

    async fn reply_err(&self, reply_err: ReplyErr) -> Result<(), zenoh_result::Error> {
        let q = self
            .pending_queries
            .lock()
            .unwrap()
            .get(&reply_err.query_id)
            .cloned();

        match q {
            Some(q) => {
                q.reply_err(reply_err.payload)
                    .encoding(reply_err.encoding)
                    .await?;
            }
            None => {
                bail!("Query with id {} does not exist", reply_err.query_id);
            }
        }

        Ok(())
    }

    async fn declare_liveliness_token(
        &mut self,
        declare_liveliness_token: DeclareLivelinessToken,
    ) -> Result<Option<OutRemoteMessage>, zenoh_result::Error> {
        if self
            .liveliness_tokens
            .contains_key(&declare_liveliness_token.id)
        {
            bail!(
                "Liveliness token with id: '{}' already exists",
                declare_liveliness_token.id
            );
        }
        let token = self
            .session
            .liveliness()
            .declare_token(declare_liveliness_token.keyexpr)
            .await?;
        self.liveliness_tokens
            .insert(declare_liveliness_token.id, token);
        Ok(None)
    }

    async fn undeclare_liveliness_token(
        &mut self,
        undeclare_liveliness_token: UndeclareLivelinessToken,
    ) -> Result<Option<OutRemoteMessage>, zenoh_result::Error> {
        match self
            .liveliness_tokens
            .remove(&undeclare_liveliness_token.id)
        {
            Some(t) => {
                t.undeclare().await?;
                Ok(None)
            }
            None => bail!(
                "Liveliness token with id {} does not exist",
                undeclare_liveliness_token.id
            ),
        }
    }

    async fn declare_liveliness_subscriber(
        &mut self,
        declare_liveliness_subscriber: DeclareLivelinessSubscriber,
    ) -> Result<Option<OutRemoteMessage>, zenoh_result::Error> {
        if self
            .liveliness_subscribers
            .contains_key(&declare_liveliness_subscriber.id)
        {
            bail!(
                "Liveliness subscriber with id: '{}' already exists",
                declare_liveliness_subscriber.id
            );
        }
        let tx = self.tx.clone();
        let subscriber = self
            .session
            .liveliness()
            .declare_subscriber(declare_liveliness_subscriber.keyexpr)
            .history(declare_liveliness_subscriber.history)
            .callback(move |sample| {
                let msg = interface::Sample {
                    subscriber_id: declare_liveliness_subscriber.id,
                    sample,
                };
                let _ = tx.send((OutRemoteMessage::Sample(msg), None));
            })
            .await?;
        self.liveliness_subscribers
            .insert(declare_liveliness_subscriber.id, subscriber);
        Ok(None)
    }

    async fn undeclare_liveliness_subscriber(
        &mut self,
        undeclare_liveliness_subscriber: UndeclareLivelinessSubscriber,
    ) -> Result<Option<OutRemoteMessage>, zenoh_result::Error> {
        match self
            .liveliness_subscribers
            .remove(&undeclare_liveliness_subscriber.id)
        {
            Some(t) => {
                t.undeclare().await?;
                Ok(None)
            }
            None => bail!(
                "Liveliness subscriber with id {} does not exist",
                undeclare_liveliness_subscriber.id
            ),
        }
    }

    async fn liveliness_get(
        &self,
        liveliness_get: LivelinessGet,
    ) -> Result<(), zenoh_result::Error> {
        self.session
            .liveliness()
            .get(liveliness_get.keyexpr)
            .timeout(Duration::from_millis(liveliness_get.timeout_ms as u64))
            .with(self.create_get_callback(liveliness_get.id))
            .await?;
        Ok(())
    }

    fn response_final(
        &mut self,
        response_final: QueryResponseFinal,
    ) -> Result<(), zenoh_result::Error> {
        match self
            .pending_queries
            .lock()
            .unwrap()
            .pop(&response_final.query_id)
        {
            Some(_) => Ok(()),
            None => bail!("Query with id {} does not exist", response_final.query_id),
        }
    }

    pub(crate) async fn handle_message(
        &mut self,
        msg: InRemoteMessage,
    ) -> Result<Option<OutRemoteMessage>, zenoh_result::Error> {
        match msg {
            InRemoteMessage::DeclarePublisher(declare_publisher) => {
                self.declare_publisher(declare_publisher).await
            }
            InRemoteMessage::UndeclarePublisher(undeclare_publisher) => {
                self.undeclare_publisher(undeclare_publisher).await
            }
            InRemoteMessage::DeclareSubscriber(declare_subscriber) => {
                self.declare_subscriber(declare_subscriber).await
            }
            InRemoteMessage::UndeclareSubscriber(undeclare_subscriber) => {
                self.undeclare_subscriber(undeclare_subscriber).await
            }
            InRemoteMessage::DeclareQueryable(declare_queryable) => {
                self.declare_queryable(declare_queryable).await
            }
            InRemoteMessage::UndeclareQueryable(undeclare_queryable) => {
                self.undeclare_queryable(undeclare_queryable).await
            }
            InRemoteMessage::DeclareQuerier(declare_querier) => {
                self.declare_querier(declare_querier).await
            }
            InRemoteMessage::UndeclareQuerier(undeclare_querier) => {
                self.undeclare_querier(undeclare_querier).await
            }
            InRemoteMessage::GetSessionInfo(_) => Ok(Some(self.get_session_info().await)),
            InRemoteMessage::GetTimestamp(_) => Ok(Some(self.get_timestamp())),
            InRemoteMessage::Put(put) => {
                self.put(put).await?;
                Ok(None)
            }
            InRemoteMessage::Delete(delete) => {
                self.delete(delete).await?;
                Ok(None)
            }
            InRemoteMessage::PublisherPut(publisher_put) => {
                self.publisher_put(publisher_put).await?;
                Ok(None)
            }
            InRemoteMessage::PublisherDelete(publisher_delete) => {
                self.publisher_delete(publisher_delete).await?;
                Ok(None)
            }
            InRemoteMessage::Get(get) => {
                self.get(get).await?;
                Ok(None)
            }
            InRemoteMessage::QuerierGet(querier_get) => {
                self.querier_get(querier_get).await?;
                Ok(None)
            }
            InRemoteMessage::ReplyOk(reply_ok) => {
                self.reply_ok(reply_ok).await?;
                Ok(None)
            }
            InRemoteMessage::ReplyDel(reply_del) => {
                self.reply_del(reply_del).await?;
                Ok(None)
            }
            InRemoteMessage::ReplyErr(reply_err) => {
                self.reply_err(reply_err).await?;
                Ok(None)
            }
            InRemoteMessage::DeclareLivelinessToken(declare_liveliness_token) => {
                self.declare_liveliness_token(declare_liveliness_token)
                    .await
            }
            InRemoteMessage::UndeclareLivelinessToken(undeclare_liveliness_token) => {
                self.undeclare_liveliness_token(undeclare_liveliness_token)
                    .await
            }
            InRemoteMessage::DeclareLivelinessSubscriber(declare_liveliness_subscriber) => {
                self.declare_liveliness_subscriber(declare_liveliness_subscriber)
                    .await
            }
            InRemoteMessage::LivelinessGet(liveliness_get) => {
                self.liveliness_get(liveliness_get).await?;
                Ok(None)
            }
            InRemoteMessage::QueryResponseFinal(response_final) => {
                self.response_final(response_final)?;
                Ok(None)
            }
            InRemoteMessage::UndeclareLivelinessSubscriber(undeclare_liveliness_subscriber) => {
                self.undeclare_liveliness_subscriber(undeclare_liveliness_subscriber)
                    .await
            }
            InRemoteMessage::Ping(_) => Ok(Some(OutRemoteMessage::PingAck(PingAck {
                uuid: self.id.clone(),
            }))),
        }
    }
}
