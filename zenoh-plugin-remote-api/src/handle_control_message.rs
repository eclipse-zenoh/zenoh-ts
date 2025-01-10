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

use std::{error::Error, net::SocketAddr, time::Duration};

use base64::{prelude::BASE64_STANDARD, Engine};
use tracing::{error, warn};
use uuid::Uuid;
use zenoh::{
    bytes::ZBytes,
    handlers::{FifoChannel, RingChannel},
    key_expr::KeyExpr,
    query::Selector,
};

use crate::{
    interface::{
        B64String, ControlMsg, DataMsg, HandlerChannel, LivelinessMsg, QueryWS, QueryableMsg,
        RemoteAPIMsg, ReplyWS, SampleWS, SessionInfo,
    },
    spawn_future, RemoteState, StateMap,
};

///
/// Macro to replace the pattern of adding to builders if a field exists
/// i.e. add_if_some!(consolidation, get_builder);
/// expands to
/// if Some(consolidation) = consolidation{
///     get_builder = get_builder.consolidation(consolidation);
/// }
macro_rules! add_if_some {
    ($x:ident, $y:ident) => {
        if let Some($x) = $x {
            $y = $y.$x($x);
        }
    };
}

/// Function to handle control messages recieved from the client to Plugin
/// This function should never be long running.
/// The main purpose of this function is to handle changes to state,
/// and any long running operations i.e. Get / Queryable should spawn futures with thier long running resources.
pub(crate) async fn handle_control_message(
    ctrl_msg: ControlMsg,
    sock_addr: SocketAddr,
    state_map: StateMap,
) -> Result<(), Box<dyn Error + Send + Sync>> {
    // Access State Structure
    let mut state_writer = state_map.write().await;
    let state_map = match state_writer.get_mut(&sock_addr) {
        Some(state_map) => state_map,
        None => {
            tracing::warn!("State Map Does not contain SocketAddr");
            return Ok(());
        }
    };

    // Handle Control Message
    match ctrl_msg {
        ControlMsg::OpenSession => {
            return Ok(());
        }
        ControlMsg::SessionInfo => {
            let session_info = state_map.session.info();

            let zid = session_info.zid().await.to_string();
            let z_peers: Vec<String> = session_info
                .peers_zid()
                .await
                .map(|x| x.to_string())
                .collect();
            let z_routers: Vec<String> = session_info
                .routers_zid()
                .await
                .map(|x| x.to_string())
                .collect();

            let session_info = SessionInfo {
                zid,
                z_routers,
                z_peers,
            };

            let remote_api_message = RemoteAPIMsg::Data(DataMsg::SessionInfo(session_info));

            if let Err(e) = state_map.websocket_tx.send(remote_api_message) {
                error!("Forward Sample Channel error: {e}");
            };
        }
        ControlMsg::CloseSession => {
            if let Some(state_map) = state_writer.remove(&sock_addr) {
                state_map.cleanup().await;
            } else {
                warn!("State Map Does not contain SocketAddr");
            }
        }
        ControlMsg::NewTimestamp(uuid) => {
            let ts = state_map.session.new_timestamp();
            let ts_string = ts.to_string();
            let _ = state_map.timestamps.insert(uuid, ts);

            let since_the_epoch = ts
                .get_time()
                .to_system_time()
                .duration_since(std::time::UNIX_EPOCH)
                .expect("Time went backwards")
                .as_millis() as u64; // JS numbers are F64, is the only way to get a Number that is similar to what is produced by Date.now() in Javascript

            if let Err(e) = state_map
                .websocket_tx
                .send(RemoteAPIMsg::Data(DataMsg::NewTimestamp {
                    id: uuid,
                    string_rep: ts_string,
                    millis_since_epoch: since_the_epoch,
                }))
            {
                error!("{}", e);
            };
        }
        ControlMsg::Get {
            key_expr,
            parameters,
            id,
            handler,
            consolidation,
            congestion_control,
            priority,
            express,
            target,
            encoding,
            payload,
            attachment,
            timeout,
        } => {
            let selector = Selector::owned(key_expr, parameters.unwrap_or_default());
            let mut get_builder = state_map.session.get(selector);

            add_if_some!(consolidation, get_builder);
            add_if_some!(congestion_control, get_builder);
            add_if_some!(priority, get_builder);
            add_if_some!(express, get_builder);
            add_if_some!(encoding, get_builder);
            add_if_some!(target, get_builder);

            if let Some(payload_b64) = payload {
                match payload_b64.b64_to_bytes() {
                    Ok(payload) => get_builder = get_builder.payload(payload),
                    Err(err) => warn!("Could not decode B64 encoded bytes {err}"),
                }
            }
            if let Some(attachment_b64) = attachment {
                match attachment_b64.b64_to_bytes() {
                    Ok(attachment) => get_builder = get_builder.attachment(attachment),
                    Err(err) => warn!("Could not decode B64 encoded bytes {err}"),
                }
            }
            if let Some(timeout) = timeout {
                get_builder = get_builder.timeout(Duration::from_millis(timeout));
            }

            let ws_tx = state_map.websocket_tx.clone();
            let finish_msg = RemoteAPIMsg::Control(ControlMsg::GetFinished { id });
            match handler {
                HandlerChannel::Fifo(size) => {
                    let receiver = get_builder.with(FifoChannel::new(size)).await?;
                    spawn_future(async move {
                        while let Ok(reply) = receiver.recv_async().await {
                            let reply_ws = ReplyWS::from((reply, id));
                            let remote_api_msg = RemoteAPIMsg::Data(DataMsg::GetReply(reply_ws));
                            if let Err(err) = ws_tx.send(remote_api_msg) {
                                tracing::error!("{}", err);
                            }
                        }
                        if let Err(err) = ws_tx.send(finish_msg) {
                            tracing::error!("{}", err);
                        }
                    });
                }
                HandlerChannel::Ring(size) => {
                    let receiver = get_builder.with(RingChannel::new(size)).await?;
                    spawn_future(async move {
                        while let Ok(reply) = receiver.recv_async().await {
                            let reply_ws = ReplyWS::from((reply, id));
                            let remote_api_msg = RemoteAPIMsg::Data(DataMsg::GetReply(reply_ws));
                            if let Err(err) = ws_tx.send(remote_api_msg) {
                                tracing::error!("{}", err);
                            }
                        }
                        if let Err(err) = ws_tx.send(finish_msg) {
                            tracing::error!("{}", err);
                        }
                    });
                }
            };
        }
        ControlMsg::Put {
            key_expr,
            payload,
            encoding,
            congestion_control,
            priority,
            express,
            attachment,
            timestamp,
        } => {
            let mut put_builder = match payload.b64_to_bytes() {
                Ok(payload) => state_map.session.put(key_expr, payload),
                Err(err) => {
                    warn!("ControlMsg::Put , could not decode B64 encoded bytes {err}");
                    return Ok(());
                }
            };

            add_if_some!(encoding, put_builder);
            add_if_some!(congestion_control, put_builder);
            add_if_some!(priority, put_builder);
            add_if_some!(express, put_builder);

            if let Some(ts) = timestamp.and_then(|k| state_map.timestamps.get(&k)) {
                put_builder = put_builder.timestamp(*ts);
            }

            if let Some(attachment_b64) = attachment {
                match attachment_b64.b64_to_bytes() {
                    Ok(attachment) => put_builder = put_builder.attachment(attachment),
                    Err(err) => warn!("Could not decode B64 encoded bytes {err}"),
                }
            }

            put_builder.await?;
        }
        ControlMsg::Delete {
            key_expr,
            congestion_control,
            priority,
            express,
            attachment,
            timestamp,
        } => {
            let mut delete_builder = state_map.session.delete(key_expr);
            add_if_some!(congestion_control, delete_builder);
            add_if_some!(priority, delete_builder);
            add_if_some!(express, delete_builder);
            if let Some(ts) = timestamp.and_then(|k| state_map.timestamps.get(&k)) {
                delete_builder = delete_builder.timestamp(*ts);
            }

            if let Some(attachment_b64) = attachment {
                match attachment_b64.b64_to_bytes() {
                    Ok(attachment) => delete_builder = delete_builder.attachment(attachment),
                    Err(err) => warn!("Could not decode B64 encoded bytes {err}"),
                }
            }

            delete_builder.await?;
        }
        // SUBSCRIBER
        ControlMsg::DeclareSubscriber {
            key_expr: owned_key_expr,
            handler,
            id: subscriber_uuid,
        } => {
            let key_expr = KeyExpr::new(owned_key_expr.clone())?;
            let ch_tx = state_map.websocket_tx.clone();
            let subscriber_builder = state_map.session.declare_subscriber(key_expr);

            let join_handle = match handler {
                HandlerChannel::Fifo(size) => {
                    let subscriber = subscriber_builder.with(FifoChannel::new(size)).await?;
                    spawn_future(async move {
                        while let Ok(sample) = subscriber.recv_async().await {
                            let sample_ws = SampleWS::from(sample);
                            let remote_api_message =
                                RemoteAPIMsg::Data(DataMsg::Sample(sample_ws, subscriber_uuid));
                            if let Err(e) = ch_tx.send(remote_api_message) {
                                error!("Forward Sample Channel error: {e}");
                            };
                        }
                    })
                }
                HandlerChannel::Ring(size) => {
                    let subscriber = subscriber_builder.with(RingChannel::new(size)).await?;
                    spawn_future(async move {
                        while let Ok(sample) = subscriber.recv_async().await {
                            let sample_ws = SampleWS::from(sample);
                            let remote_api_message =
                                RemoteAPIMsg::Data(DataMsg::Sample(sample_ws, subscriber_uuid));
                            if let Err(e) = ch_tx.send(remote_api_message) {
                                error!("Forward Sample Channel error: {e}");
                            };
                        }
                    })
                }
            };

            state_map
                .subscribers
                .insert(subscriber_uuid, (join_handle, owned_key_expr));

            let remote_api_msg = RemoteAPIMsg::Control(ControlMsg::Subscriber(subscriber_uuid));
            state_map.websocket_tx.send(remote_api_msg)?;
        }
        ControlMsg::UndeclareSubscriber(uuid) => {
            if let Some((join_handle, _)) = state_map.subscribers.remove(&uuid) {
                join_handle.abort(); // This should drop the underlying subscriber of the future
            } else {
                warn!("UndeclareSubscriber: No Subscriber with UUID {uuid}");
            }
        }
        // Publisher
        ControlMsg::DeclarePublisher {
            key_expr,
            id: uuid,
            encoding,
            congestion_control,
            priority,
            express,
            reliability,
        } => {
            let mut publisher_builder = state_map.session.declare_publisher(key_expr);
            add_if_some!(encoding, publisher_builder);
            add_if_some!(congestion_control, publisher_builder);
            add_if_some!(priority, publisher_builder);
            add_if_some!(express, publisher_builder);
            add_if_some!(reliability, publisher_builder);

            let publisher = publisher_builder.await?;
            state_map.publishers.insert(uuid, publisher);
        }
        ControlMsg::UndeclarePublisher(id) => {
            if let Some(publisher) = state_map.publishers.remove(&id) {
                publisher.undeclare().await?;
            } else {
                warn!("UndeclarePublisher: No Publisher with UUID {id}");
            }
        }
        // Queryable
        ControlMsg::DeclareQueryable {
            key_expr,
            complete,
            id: queryable_uuid,
            handler,
        } => {
            let unanswered_queries = state_map.unanswered_queries.clone();
            let ch_tx = state_map.websocket_tx.clone();
            let query_builder = state_map
                .session
                .declare_queryable(&key_expr)
                .complete(complete);

            let join_handle = match handler {
                HandlerChannel::Fifo(size) => {
                    let queryable = query_builder.with(FifoChannel::new(size)).await?;
                    spawn_future(async move {
                        while let Ok(query) = queryable.recv_async().await {
                            let query_uuid = Uuid::new_v4();
                            let queryable_msg = QueryableMsg::Query {
                                queryable_uuid,
                                query: QueryWS::from((&query, query_uuid)),
                            };

                            match unanswered_queries.write() {
                                Ok(mut rw_lock) => {
                                    rw_lock.insert(query_uuid, query);
                                }
                                Err(err) => {
                                    tracing::error!("Query RwLock has been poisoned {err:?}")
                                }
                            }

                            let remote_msg = RemoteAPIMsg::Data(DataMsg::Queryable(queryable_msg));
                            if let Err(err) = ch_tx.send(remote_msg) {
                                tracing::error!("Could not send Queryable Message on WS {}", err);
                            };
                        }
                    })
                }
                HandlerChannel::Ring(size) => {
                    let queryable = query_builder.with(RingChannel::new(size)).await?;
                    spawn_future(async move {
                        while let Ok(query) = queryable.recv_async().await {
                            let query_uuid = Uuid::new_v4();
                            let queryable_msg = QueryableMsg::Query {
                                queryable_uuid,
                                query: QueryWS::from((&query, query_uuid)),
                            };

                            match unanswered_queries.write() {
                                Ok(mut rw_lock) => {
                                    rw_lock.insert(query_uuid, query);
                                }
                                Err(err) => {
                                    tracing::error!("Query RwLock has been poisoned {err:?}")
                                }
                            }

                            let remote_msg = RemoteAPIMsg::Data(DataMsg::Queryable(queryable_msg));
                            if let Err(err) = ch_tx.send(remote_msg) {
                                tracing::error!("Could not send Queryable Message on WS {}", err);
                            };
                        }
                    })
                }
            };

            state_map
                .queryables
                .insert(queryable_uuid, (join_handle, key_expr));
        }
        ControlMsg::UndeclareQueryable(uuid) => {
            if let Some((queryable, _)) = state_map.queryables.remove(&uuid) {
                queryable.abort();
            };
        }
        ControlMsg::Liveliness(liveliness_msg) => {
            return handle_liveliness(liveliness_msg, state_map).await;
        }
        ControlMsg::DeclareQuerier {
            id,
            key_expr,
            target,
            timeout,
            accept_replies,
            congestion_control,
            priority,
            consolidation,
            allowed_destination,
            express,
        } => {
            let mut querier_builder = state_map.session.declare_querier(key_expr);
            let timeout = timeout.map(Duration::from_millis);

            add_if_some!(target, querier_builder);
            add_if_some!(timeout, querier_builder);
            add_if_some!(accept_replies, querier_builder);
            add_if_some!(accept_replies, querier_builder);
            add_if_some!(congestion_control, querier_builder);
            add_if_some!(priority, querier_builder);
            add_if_some!(consolidation, querier_builder);
            add_if_some!(allowed_destination, querier_builder);
            add_if_some!(express, querier_builder);

            let querier = querier_builder.await?;
            state_map.queriers.insert(id, querier);
        }
        ControlMsg::UndeclareQuerier(uuid) => {
            if let Some(querier) = state_map.queriers.remove(&uuid) {
                querier.undeclare().await?;
            } else {
                warn!("No Querier Found with UUID {}", uuid);
            };
        }
        ControlMsg::QuerierGet {
            get_id,
            querier_id,
            encoding,
            payload,
            attachment,
        } => {
            if let Some(querier) = state_map.queriers.get(&querier_id) {
                let mut get_builder = querier.get();

                let payload = payload
                    .map(|B64String(x)| BASE64_STANDARD.decode(x))
                    .and_then(|res_vec_bytes| {
                        if let Ok(vec_bytes) = res_vec_bytes {
                            Some(ZBytes::from(vec_bytes))
                        } else {
                            None
                        }
                    });

                let attachment: Option<ZBytes> = attachment
                    .map(|B64String(x)| BASE64_STANDARD.decode(x))
                    .and_then(|res_vec_bytes| {
                        if let Ok(vec_bytes) = res_vec_bytes {
                            Some(ZBytes::from(vec_bytes))
                        } else {
                            None
                        }
                    });
                add_if_some!(encoding, get_builder);
                add_if_some!(payload, get_builder);
                add_if_some!(attachment, get_builder);
                let receiver = get_builder.await?;
                let ws_tx = state_map.websocket_tx.clone();
                let finish_msg = RemoteAPIMsg::Control(ControlMsg::GetFinished { id: get_id });

                spawn_future(async move {
                    while let Ok(reply) = receiver.recv_async().await {
                        let reply_ws = ReplyWS::from((reply, get_id));
                        let remote_api_msg = RemoteAPIMsg::Data(DataMsg::GetReply(reply_ws));
                        if let Err(err) = ws_tx.send(remote_api_msg) {
                            tracing::error!("{}", err);
                        }
                    }
                    if let Err(err) = ws_tx.send(finish_msg) {
                        tracing::error!("{}", err);
                    }
                });
            } else {
                // TODO: Do we want to add an error here ?
                warn!("No Querier With ID {querier_id} found")
            }
        }
        msg @ (ControlMsg::GetFinished { id: _ }
        | ControlMsg::Session(_)
        | ControlMsg::Subscriber(_)) => {
            // make server recieving these types unrepresentable
            error!("Backend should not recieve this message Type: {msg:?}");
        }
    };
    Ok(())
}

// Handle Liveliness Messages
async fn handle_liveliness(
    liveliness_msg: LivelinessMsg,
    state_map: &mut RemoteState,
) -> Result<(), Box<dyn Error + Send + Sync>> {
    let liveliness = state_map.session.liveliness();
    match liveliness_msg {
        LivelinessMsg::DeclareToken { key_expr, id } => {
            let token = liveliness.declare_token(key_expr).await?;
            state_map.liveliness_tokens.insert(id, token);
        }
        LivelinessMsg::UndeclareToken(uuid) => {
            if let Some(token) = state_map.liveliness_tokens.remove(&uuid) {
                token.undeclare().await?;
            }
        }
        LivelinessMsg::DeclareSubscriber {
            key_expr: owned_key_expr,
            id,
            history,
        } => {
            let key_expr = KeyExpr::new(owned_key_expr.clone())?;
            let subscriber = liveliness
                .declare_subscriber(key_expr)
                .history(history)
                .await?;
            let ch_tx = state_map.websocket_tx.clone();

            let handler = spawn_future(async move {
                while let Ok(sample) = subscriber.recv_async().await {
                    let sample_ws = SampleWS::from(sample);
                    let remote_api_message = RemoteAPIMsg::Data(DataMsg::Sample(sample_ws, id));
                    if let Err(e) = ch_tx.send(remote_api_message) {
                        error!("Forward Sample Channel error: {e}");
                    };
                }
            });
            state_map
                .liveliness_subscribers
                .insert(id, (handler, owned_key_expr));
        }
        LivelinessMsg::UndeclareSubscriber(uuid) => {
            if let Some((join_handle, _)) = state_map.liveliness_subscribers.remove(&uuid) {
                join_handle.abort(); // This should drop the underlying liveliness_subscribers of the future
            } else {
                warn!("UndeclareSubscriber: No Subscriber with UUID {uuid}");
            }
        }
        LivelinessMsg::Get {
            key_expr,
            id,
            timeout,
        } => {
            let mut builder = liveliness.get(key_expr);
            if let Some(timeout) = timeout {
                builder = builder.timeout(Duration::from_millis(timeout));
            }
            let receiver = builder.await?;
            let ws_tx = state_map.websocket_tx.clone();

            spawn_future(async move {
                while let Ok(reply) = receiver.recv_async().await {
                    let reply_ws = ReplyWS::from((reply, id));
                    let remote_api_msg = RemoteAPIMsg::Data(DataMsg::GetReply(reply_ws));
                    if let Err(err) = ws_tx.send(remote_api_msg) {
                        tracing::error!("{}", err);
                    }
                }
                let remote_api_msg = RemoteAPIMsg::Control(ControlMsg::GetFinished { id });
                if let Err(err) = ws_tx.send(remote_api_msg) {
                    tracing::error!("{}", err);
                }
            });
        }
    }
    Ok(())
}
