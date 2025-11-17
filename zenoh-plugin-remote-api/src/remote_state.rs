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
    matching::MatchingListener,
    pubsub::{Publisher, Subscriber},
    query::{Querier, Query, Queryable, Reply, Selector},
    Session,
};
use zenoh_result::bail;

use crate::{
    interface::{
        self, DeclareLivelinessSubscriber, DeclareLivelinessToken, DeclarePublisher,
        DeclareQuerier, DeclareQueryable, DeclareSubscriber, Delete, Get, LivelinessGet,
        LivelinessTokenId, MatchingListenerId, MatchingStatus, PingAck,
        PublisherDeclareMatchingListener, PublisherDelete, PublisherGetMatchingStatus, PublisherId,
        PublisherPut, Put, QuerierDeclareMatchingListener, QuerierGet, QuerierGetMatchingStatus,
        QuerierId, QueryId, QueryResponseFinal, QueryableId, ReplyDel, ReplyErr, ReplyOk,
        ResponseSessionInfo, ResponseTimestamp, SubscriberId, UndeclareLivelinessSubscriber,
        UndeclareLivelinessToken, UndeclareMatchingListener, UndeclarePublisher, UndeclareQuerier,
        UndeclareQueryable, UndeclareSubscriber,
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
    subscribers: HashMap<SubscriberId, Subscriber<()>>,
    publishers: HashMap<PublisherId, Publisher<'static>>,
    queryables: HashMap<QueryableId, Queryable<()>>,
    pending_queries: Arc<Mutex<LruCache<QueryId, Query>>>,
    query_counter: Arc<AtomicU32>,
    liveliness_tokens: HashMap<LivelinessTokenId, LivelinessToken>,
    liveliness_subscribers: HashMap<SubscriberId, Subscriber<()>>,
    queriers: HashMap<QuerierId, Querier<'static>>,
    matching_listeners: HashMap<MatchingListenerId, MatchingListener<()>>,
}

impl RemoteState {
    pub(crate) fn new(
        tx: Sender<(OutRemoteMessage, Option<SequenceId>)>,
        admin_client: Arc<Mutex<AdminSpaceClient>>,
        session: Session,
    ) -> Self {
        let id = admin_client.lock().unwrap().id().to_string();
        tracing::trace!("RemoteState::new: id={}", id);
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
            matching_listeners: HashMap::new(),
        }
    }

    pub(crate) async fn clear(&mut self) {
        tracing::trace!("clear: starting cleanup");
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
        tracing::trace!("clear: cleanup completed");
    }

    async fn declare_publisher(
        &mut self,
        declare_publisher: DeclarePublisher,
    ) -> Result<Option<OutRemoteMessage>, zenoh_result::Error> {
        tracing::trace!(
            "declare_publisher: id={}, keyexpr={}",
            declare_publisher.id,
            declare_publisher.keyexpr
        );
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
            .register_publisher(declare_publisher.id.0, publisher.key_expr().as_str());
        self.publishers.insert(declare_publisher.id, publisher);
        tracing::trace!(
            "declare_publisher: id={} completed successfully",
            declare_publisher.id
        );
        Ok(None)
    }

    async fn undeclare_publisher(
        &mut self,
        undeclare_publisher: UndeclarePublisher,
    ) -> Result<Option<OutRemoteMessage>, zenoh_result::Error> {
        tracing::trace!("undeclare_publisher: id={}", undeclare_publisher.id);
        match self.publishers.remove(&undeclare_publisher.id) {
            Some(p) => {
                p.undeclare().await?;
                self.admin_client
                    .lock()
                    .unwrap()
                    .unregister_publisher(undeclare_publisher.id.0);
                tracing::trace!(
                    "undeclare_publisher: id={} completed successfully",
                    undeclare_publisher.id
                );
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
        tracing::trace!(
            "declare_subscriber: id={}, keyexpr={}",
            declare_subscriber.id.0,
            declare_subscriber.keyexpr
        );
        if self.subscribers.contains_key(&declare_subscriber.id) {
            bail!(
                "Subscriber with id: '{}' already exists",
                declare_subscriber.id.0
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
            .register_subscriber(declare_subscriber.id.0, subscriber.key_expr().as_str());
        self.subscribers.insert(declare_subscriber.id, subscriber);
        tracing::trace!(
            "declare_subscriber: id={} completed successfully",
            declare_subscriber.id.0
        );
        Ok(None)
    }

    async fn undeclare_subscriber(
        &mut self,
        undeclare_subscriber: UndeclareSubscriber,
    ) -> Result<Option<OutRemoteMessage>, zenoh_result::Error> {
        tracing::trace!("undeclare_subscriber: id={}", undeclare_subscriber.id.0);
        match self.subscribers.remove(&undeclare_subscriber.id) {
            Some(s) => {
                s.undeclare().await?;
                self.admin_client
                    .lock()
                    .unwrap()
                    .unregister_subscriber(undeclare_subscriber.id.0);
                tracing::trace!(
                    "undeclare_subscriber: id={} completed successfully",
                    undeclare_subscriber.id.0
                );
                Ok(None)
            }
            None => bail!(
                "Subscriber with id {} does not exist",
                undeclare_subscriber.id.0
            ),
        }
    }

    async fn declare_queryable(
        &mut self,
        declare_queryable: DeclareQueryable,
    ) -> Result<Option<OutRemoteMessage>, zenoh_result::Error> {
        tracing::trace!(
            "declare_queryable: id={}, keyexpr={}",
            declare_queryable.id,
            declare_queryable.keyexpr
        );
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
                let query_id =
                    QueryId(query_counter.fetch_add(1, std::sync::atomic::Ordering::SeqCst));
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
            .register_queryable(declare_queryable.id.0, queryable.key_expr().as_str());
        self.queryables.insert(declare_queryable.id, queryable);
        tracing::trace!(
            "declare_queryable: id={} completed successfully",
            declare_queryable.id
        );
        Ok(None)
    }

    async fn undeclare_queryable(
        &mut self,
        undeclare_queryable: UndeclareQueryable,
    ) -> Result<Option<OutRemoteMessage>, zenoh_result::Error> {
        tracing::trace!("undeclare_queryable: id={}", undeclare_queryable.id);
        match self.queryables.remove(&undeclare_queryable.id) {
            Some(q) => {
                q.undeclare().await?;
                self.admin_client
                    .lock()
                    .unwrap()
                    .unregister_queryable(undeclare_queryable.id.0);
                tracing::trace!(
                    "undeclare_queryable: id={} completed successfully",
                    undeclare_queryable.id
                );
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
        tracing::trace!(
            "declare_querier: id={}, keyexpr={}",
            declare_querier.id,
            declare_querier.keyexpr
        );
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
            .register_querier(declare_querier.id.0, querier.key_expr().as_str());
        self.queriers.insert(declare_querier.id, querier);
        tracing::trace!(
            "declare_querier: id={} completed successfully",
            declare_querier.id
        );
        Ok(None)
    }

    async fn undeclare_querier(
        &mut self,
        undeclare_querier: UndeclareQuerier,
    ) -> Result<Option<OutRemoteMessage>, zenoh_result::Error> {
        tracing::trace!("undeclare_querier: id={}", undeclare_querier.id);
        match self.queriers.remove(&undeclare_querier.id) {
            Some(q) => {
                q.undeclare().await?;
                self.admin_client
                    .lock()
                    .unwrap()
                    .unregister_querier(undeclare_querier.id.0);
                tracing::trace!(
                    "undeclare_querier: id={} completed successfully",
                    undeclare_querier.id
                );
                Ok(None)
            }
            None => bail!("Querier with id {} does not exist", undeclare_querier.id),
        }
    }

    async fn get_session_info(&self) -> OutRemoteMessage {
        tracing::trace!("get_session_info");
        let info = self.session.info();
        OutRemoteMessage::ResponseSessionInfo(ResponseSessionInfo {
            zid: info.zid().await,
            z_routers: info.routers_zid().await.collect(),
            z_peers: info.peers_zid().await.collect(),
        })
    }

    fn get_timestamp(&self) -> OutRemoteMessage {
        tracing::trace!("get_timestamp");
        OutRemoteMessage::ResponseTimestamp(ResponseTimestamp {
            timestamp: self.session.new_timestamp(),
        })
    }

    async fn put(&self, put: Put) -> Result<(), zenoh_result::Error> {
        tracing::trace!("put: keyexpr={}", put.keyexpr);
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
        tracing::trace!("put: completed successfully");
        Ok(())
    }

    async fn delete(&self, delete: Delete) -> Result<(), zenoh_result::Error> {
        tracing::trace!("delete: keyexpr={}", delete.keyexpr);
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
        tracing::trace!("delete: completed successfully");
        Ok(())
    }

    async fn publisher_put(&self, publisher_put: PublisherPut) -> Result<(), zenoh_result::Error> {
        tracing::trace!("publisher_put: publisher_id={}", publisher_put.publisher_id);
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
                tracing::trace!(
                    "publisher_put: publisher_id={} completed successfully",
                    publisher_put.publisher_id
                );
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
        tracing::trace!(
            "publisher_delete: publisher_id={}",
            publisher_delete.publisher_id
        );
        match self.publishers.get(&publisher_delete.publisher_id) {
            Some(p) => {
                p.delete()
                    .attachment(publisher_delete.attachment)
                    .timestamp(publisher_delete.timestamp)
                    .await?;
                tracing::trace!(
                    "publisher_delete: publisher_id={} completed successfully",
                    publisher_delete.publisher_id
                );
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
    fn create_get_callback(&self, query_id: QueryId) -> CallbackDrop<impl Fn(Reply), impl FnMut()> {
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
        tracing::trace!("get: id={}, keyexpr={}", get.id, get.keyexpr);
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
        tracing::trace!("get: id={} completed successfully", get.id);
        Ok(())
    }

    async fn querier_get(&self, querier_get: QuerierGet) -> Result<(), zenoh_result::Error> {
        tracing::trace!(
            "querier_get: id={}, querier_id={}",
            querier_get.id,
            querier_get.querier_id
        );
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
                tracing::trace!("querier_get: id={} completed successfully", querier_get.id);
                Ok(())
            }
            None => bail!("Querier with id {} does not exist", querier_get.id),
        }
    }

    async fn reply_ok(&self, reply_ok: ReplyOk) -> Result<(), zenoh_result::Error> {
        tracing::trace!(
            "reply_ok: query_id={}, keyexpr={}",
            reply_ok.query_id,
            reply_ok.keyexpr
        );
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
                tracing::trace!(
                    "reply_ok: query_id={} completed successfully",
                    reply_ok.query_id
                );
            }
            None => {
                bail!("Query with id {} does not exist", reply_ok.query_id);
            }
        }

        Ok(())
    }

    async fn reply_del(&self, reply_del: ReplyDel) -> Result<(), zenoh_result::Error> {
        tracing::trace!(
            "reply_del: query_id={}, keyexpr={}",
            reply_del.query_id,
            reply_del.keyexpr
        );
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
                tracing::trace!(
                    "reply_del: query_id={} completed successfully",
                    reply_del.query_id
                );
            }
            None => {
                bail!("Query with id {} does not exist", reply_del.query_id);
            }
        }

        Ok(())
    }

    async fn reply_err(&self, reply_err: ReplyErr) -> Result<(), zenoh_result::Error> {
        tracing::trace!("reply_err: query_id={}", reply_err.query_id);
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
                tracing::trace!(
                    "reply_err: query_id={} completed successfully",
                    reply_err.query_id
                );
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
        tracing::trace!(
            "declare_liveliness_token: id={}, keyexpr={}",
            declare_liveliness_token.id,
            declare_liveliness_token.keyexpr
        );
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
        tracing::trace!(
            "declare_liveliness_token: id={} completed successfully",
            declare_liveliness_token.id
        );
        Ok(None)
    }

    async fn undeclare_liveliness_token(
        &mut self,
        undeclare_liveliness_token: UndeclareLivelinessToken,
    ) -> Result<Option<OutRemoteMessage>, zenoh_result::Error> {
        tracing::trace!(
            "undeclare_liveliness_token: id={}",
            undeclare_liveliness_token.id
        );
        match self
            .liveliness_tokens
            .remove(&undeclare_liveliness_token.id)
        {
            Some(t) => {
                t.undeclare().await?;
                tracing::trace!(
                    "undeclare_liveliness_token: id={} completed successfully",
                    undeclare_liveliness_token.id
                );
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
        tracing::trace!(
            "declare_liveliness_subscriber: id={}, keyexpr={}",
            declare_liveliness_subscriber.id.0,
            declare_liveliness_subscriber.keyexpr
        );
        if self
            .liveliness_subscribers
            .contains_key(&declare_liveliness_subscriber.id)
        {
            bail!(
                "Liveliness subscriber with id: '{}' already exists",
                declare_liveliness_subscriber.id.0
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
        tracing::trace!(
            "declare_liveliness_subscriber: id={} completed successfully",
            declare_liveliness_subscriber.id.0
        );
        Ok(None)
    }

    async fn undeclare_liveliness_subscriber(
        &mut self,
        undeclare_liveliness_subscriber: UndeclareLivelinessSubscriber,
    ) -> Result<Option<OutRemoteMessage>, zenoh_result::Error> {
        tracing::trace!(
            "undeclare_liveliness_subscriber: id={}",
            undeclare_liveliness_subscriber.id.0
        );
        match self
            .liveliness_subscribers
            .remove(&undeclare_liveliness_subscriber.id)
        {
            Some(t) => {
                t.undeclare().await?;
                tracing::trace!(
                    "undeclare_liveliness_subscriber: id={} completed successfully",
                    undeclare_liveliness_subscriber.id.0
                );
                Ok(None)
            }
            None => bail!(
                "Liveliness subscriber with id {} does not exist",
                undeclare_liveliness_subscriber.id.0
            ),
        }
    }

    async fn liveliness_get(
        &self,
        liveliness_get: LivelinessGet,
    ) -> Result<(), zenoh_result::Error> {
        tracing::trace!(
            "liveliness_get: id={}, keyexpr={}",
            liveliness_get.id,
            liveliness_get.keyexpr
        );
        self.session
            .liveliness()
            .get(liveliness_get.keyexpr)
            .timeout(Duration::from_millis(liveliness_get.timeout_ms as u64))
            .with(self.create_get_callback(liveliness_get.id))
            .await?;
        tracing::trace!(
            "liveliness_get: id={} completed successfully",
            liveliness_get.id
        );
        Ok(())
    }

    fn response_final(
        &mut self,
        response_final: QueryResponseFinal,
    ) -> Result<(), zenoh_result::Error> {
        tracing::trace!("response_final: query_id={}", response_final.query_id);
        match self
            .pending_queries
            .lock()
            .unwrap()
            .pop(&response_final.query_id)
        {
            Some(_) => {
                tracing::trace!(
                    "response_final: query_id={} completed successfully",
                    response_final.query_id
                );
                Ok(())
            }
            None => bail!("Query with id {} does not exist", response_final.query_id),
        }
    }

    async fn publisher_declare_matching_listener(
        &mut self,
        msg: PublisherDeclareMatchingListener,
    ) -> Result<Option<OutRemoteMessage>, zenoh_result::Error> {
        tracing::trace!(
            "publisher_declare_matching_listener: id={}, publisher_id={}",
            msg.id,
            msg.publisher_id
        );
        match self.publishers.get(&msg.publisher_id) {
            Some(publisher) => {
                if self.matching_listeners.contains_key(&msg.id) {
                    bail!("Matching listener with id: '{}' already exists", msg.id);
                }
                let tx = self.tx.clone();
                let ml = publisher
                    .matching_listener()
                    .callback(move |matching_status| {
                        let msg = interface::MatchingStatusUpdate {
                            matching_listener_id: msg.id,
                            matching: matching_status.matching(),
                        };
                        let _ = tx.send((OutRemoteMessage::MatchingStatusUpdate(msg), None));
                    })
                    .await?;
                self.matching_listeners.insert(msg.id, ml);
                tracing::trace!(
                    "publisher_declare_matching_listener: id={} completed successfully",
                    msg.id
                );
            }
            None => {
                bail!("Publisher with id: '{}' does not exist", msg.publisher_id);
            }
        };
        Ok(None)
    }

    async fn undeclare_matching_listener(
        &mut self,
        msg: UndeclareMatchingListener,
    ) -> Result<Option<OutRemoteMessage>, zenoh_result::Error> {
        tracing::trace!("undeclare_matching_listener: id={}", msg.id);
        match self.matching_listeners.remove(&msg.id) {
            Some(ml) => {
                ml.undeclare().await?;
                tracing::trace!(
                    "undeclare_matching_listener: id={} completed successfully",
                    msg.id
                );
                Ok(None)
            }
            None => bail!("Matching listener with id: '{}' does not exist", msg.id),
        }
    }

    async fn publisher_get_matching_status(
        &mut self,
        msg: PublisherGetMatchingStatus,
    ) -> Result<Option<OutRemoteMessage>, zenoh_result::Error> {
        tracing::trace!(
            "publisher_get_matching_status: publisher_id={}",
            msg.publisher_id
        );
        match self.publishers.get(&msg.publisher_id) {
            Some(p) => {
                let status = p.matching_status().await?;
                tracing::trace!(
                    "publisher_get_matching_status: publisher_id={} completed successfully",
                    msg.publisher_id
                );
                Ok(Some(OutRemoteMessage::MatchingStatus(MatchingStatus {
                    matching: status.matching(),
                })))
            }
            None => bail!("Publisher with id: '{}' does not exist", msg.publisher_id),
        }
    }

    async fn querier_declare_matching_listener(
        &mut self,
        msg: QuerierDeclareMatchingListener,
    ) -> Result<Option<OutRemoteMessage>, zenoh_result::Error> {
        tracing::trace!(
            "querier_declare_matching_listener: id={}, querier_id={}",
            msg.id,
            msg.querier_id
        );
        match self.queriers.get(&msg.querier_id) {
            Some(querier) => {
                if self.matching_listeners.contains_key(&msg.id) {
                    bail!("Matching listener with id: '{}' already exists", msg.id);
                }
                let tx = self.tx.clone();
                let ml = querier
                    .matching_listener()
                    .callback(move |matching_status| {
                        let msg = interface::MatchingStatusUpdate {
                            matching_listener_id: msg.id,
                            matching: matching_status.matching(),
                        };
                        let _ = tx.send((OutRemoteMessage::MatchingStatusUpdate(msg), None));
                    })
                    .await?;
                self.matching_listeners.insert(msg.id, ml);
                tracing::trace!(
                    "querier_declare_matching_listener: id={} completed successfully",
                    msg.id
                );
            }
            None => {
                bail!("Querier with id: '{}' does not exist", msg.querier_id);
            }
        };
        Ok(None)
    }

    async fn querier_get_matching_status(
        &mut self,
        msg: QuerierGetMatchingStatus,
    ) -> Result<Option<OutRemoteMessage>, zenoh_result::Error> {
        tracing::trace!("querier_get_matching_status: querier_id={}", msg.querier_id);
        match self.queriers.get(&msg.querier_id) {
            Some(p) => {
                let status = p.matching_status().await?;
                tracing::trace!(
                    "querier_get_matching_status: querier_id={} completed successfully",
                    msg.querier_id
                );
                Ok(Some(OutRemoteMessage::MatchingStatus(MatchingStatus {
                    matching: status.matching(),
                })))
            }
            None => bail!("Querier with id: '{}' does not exist", msg.querier_id),
        }
    }

    pub(crate) async fn handle_message(
        &mut self,
        msg: InRemoteMessage,
    ) -> Result<Option<OutRemoteMessage>, zenoh_result::Error> {
        tracing::trace!("handle_message: {:?}", std::mem::discriminant(&msg));
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
            InRemoteMessage::PublisherDeclareMatchingListener(
                publisher_declare_matching_listener,
            ) => {
                self.publisher_declare_matching_listener(publisher_declare_matching_listener)
                    .await
            }
            InRemoteMessage::UndeclareMatchingListener(undeclare_matching_listener) => {
                self.undeclare_matching_listener(undeclare_matching_listener)
                    .await
            }
            InRemoteMessage::PublisherGetMatchingStatus(publisher_get_matching_status) => {
                self.publisher_get_matching_status(publisher_get_matching_status)
                    .await
            }
            InRemoteMessage::QuerierDeclareMatchingListener(querier_declare_matching_listener) => {
                self.querier_declare_matching_listener(querier_declare_matching_listener)
                    .await
            }
            InRemoteMessage::QuerierGetMatchingStatus(querier_get_matching_status) => {
                self.querier_get_matching_status(querier_get_matching_status)
                    .await
            }
        }
    }
}
