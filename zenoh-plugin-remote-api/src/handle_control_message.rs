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

use std::{error::Error, net::SocketAddr};

use tracing::{error, warn};
use uuid::Uuid;
use zenoh::{
    handlers::{FifoChannel, RingChannel},
    key_expr::KeyExpr,
    query::Selector,
};

use crate::{
    interface::{
        ControlMsg, DataMsg, HandlerChannel, QueryWS, QueryableMsg, RemoteAPIMsg, ReplyWS, SampleWS,
    },
    spawn_future, StateMap,
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
pub(crate) async fn handle_control_message(
    ctrl_msg: ControlMsg,
    sock_addr: SocketAddr,
    state_map: StateMap,
) -> Result<Option<ControlMsg>, Box<dyn Error + Send + Sync>> {
    // Access State Structure
    let mut state_writer = state_map.write().await;
    let state_map = match state_writer.get_mut(&sock_addr) {
        Some(state_map) => state_map,
        None => {
            tracing::warn!("State Map Does not contain SocketAddr");
            return Ok(None);
        }
    };

    // Handle Control Message
    match ctrl_msg {
        ControlMsg::OpenSession => {
            return Ok(Some(ControlMsg::Session(state_map.session_id)));
        }
        ControlMsg::CloseSession => {
            if let Some(state_map) = state_writer.remove(&sock_addr) {
                state_map.cleanup().await;
            } else {
                warn!("State Map Does not contain SocketAddr");
            }
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
            encoding,
            payload,
            attachment,
        } => {
            let selector = Selector::owned(key_expr, parameters.unwrap_or_default());
            let mut get_builder = state_map.session.get(selector);

            add_if_some!(consolidation, get_builder);
            add_if_some!(congestion_control, get_builder);
            add_if_some!(priority, get_builder);
            add_if_some!(express, get_builder);
            add_if_some!(encoding, get_builder);
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

            match handler {
                HandlerChannel::Fifo(size) => {
                    let receiver = get_builder.with(FifoChannel::new(size)).await?;
                    let mut receiving: bool = true;
                    while receiving {
                        match receiver.recv_async().await {
                            Ok(reply) => {
                                let reply_ws = ReplyWS::from((reply, id));
                                let remote_api_msg =
                                    RemoteAPIMsg::Data(DataMsg::GetReply(reply_ws));
                                if let Err(err) = state_map.websocket_tx.send(remote_api_msg) {
                                    tracing::error!("{}", err);
                                }
                            }
                            Err(_) => receiving = false,
                        }
                    }
                }
                HandlerChannel::Ring(size) => {
                    let receiver = get_builder.with(RingChannel::new(size)).await?;
                    let mut receiving: bool = true;
                    while receiving {
                        match receiver.recv_async().await {
                            Ok(reply) => {
                                let reply_ws = ReplyWS::from((reply, id));
                                let remote_api_msg =
                                    RemoteAPIMsg::Data(DataMsg::GetReply(reply_ws));
                                if let Err(err) = state_map.websocket_tx.send(remote_api_msg) {
                                    tracing::error!("{}", err);
                                }
                            }
                            Err(_) => receiving = false,
                        }
                    }
                }
            };
            let remote_api_msg = RemoteAPIMsg::Control(ControlMsg::GetFinished { id });
            state_map.websocket_tx.send(remote_api_msg)?;
        }
        ControlMsg::Put {
            key_expr,
            payload,
            encoding,
            congestion_control,
            priority,
            express,
            attachment,
        } => {
            let mut put_builder = match payload.b64_to_bytes() {
                Ok(payload) => state_map.session.put(key_expr, payload),
                Err(err) => {
                    warn!("ControlMsg::Put , could not decode B64 encoded bytes {err}");
                    return Ok(None);
                }
            };

            add_if_some!(encoding, put_builder);
            add_if_some!(congestion_control, put_builder);
            add_if_some!(priority, put_builder);
            add_if_some!(express, put_builder);

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
        } => {
            let mut delete_builder = state_map.session.delete(key_expr);
            add_if_some!(congestion_control, delete_builder);
            add_if_some!(priority, delete_builder);
            add_if_some!(express, delete_builder);
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
            let key_expr = KeyExpr::new(owned_key_expr.clone()).unwrap();
            let ch_tx = state_map.websocket_tx.clone();

            let join_handle = match handler {
                HandlerChannel::Fifo(size) => {
                    let subscriber = state_map
                        .session
                        .declare_subscriber(key_expr)
                        .with(FifoChannel::new(size))
                        .await?;

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
                    let subscriber = state_map
                        .session
                        .declare_subscriber(key_expr)
                        .with(RingChannel::new(size))
                        .await?;

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
            return Ok(Some(ControlMsg::Subscriber(subscriber_uuid)));
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
        } => {
            let unanswered_queries = state_map.unanswered_queries.clone();
            let session = state_map.session.clone();
            let ch_tx = state_map.websocket_tx.clone();

            let queryable = session
                .declare_queryable(&key_expr)
                .complete(complete)
                .callback(move |query| {
                    let query_uuid = Uuid::new_v4();
                    let queryable_msg = QueryableMsg::Query {
                        queryable_uuid,
                        query: QueryWS::from((&query, query_uuid)),
                    };

                    let remote_msg = RemoteAPIMsg::Data(DataMsg::Queryable(queryable_msg));
                    if let Err(err) = ch_tx.send(remote_msg) {
                        tracing::error!("Could not send Queryable Message on WS {}", err);
                    };

                    match unanswered_queries.write() {
                        Ok(mut rw_lock) => {
                            rw_lock.insert(query_uuid, query);
                        }
                        Err(err) => tracing::error!("Query RwLock has been poisoned {err:?}"),
                    }
                })
                .await?;

            state_map
                .queryables
                .insert(queryable_uuid, (queryable, key_expr));
        }
        ControlMsg::UndeclareQueryable(uuid) => {
            if let Some((queryable, _)) = state_map.queryables.remove(&uuid) {
                queryable.undeclare().await?;
            };
        }
        msg @ (ControlMsg::GetFinished { id: _ }
        | ControlMsg::Session(_)
        | ControlMsg::Subscriber(_)) => {
            // make server recieving these types unrepresentable
            error!("Backend should not recieve this message Type: {msg:?}");
        }
    };
    Ok(None)
}
