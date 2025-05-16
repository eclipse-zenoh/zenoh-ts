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
use zenoh::{
    qos::{CongestionControl, Priority},
    query::Query,
};

use crate::{
    interface::{DataMsg, QueryReplyVariant, QueryableMsg},
    StateMap,
};

pub async fn handle_data_message(
    data_msg: DataMsg,
    sock_addr: SocketAddr,
    state_map: StateMap,
) -> Result<(), Box<dyn Error + Send + Sync>> {
    // Access State Structure
    let state_writer = state_map.read().await;
    let state_map = match state_writer.get(&sock_addr) {
        Some(x) => x,
        None => {
            tracing::warn!("State Map Does not contain SocketAddr");
            return Ok(());
        }
    };

    // Data Message
    match data_msg {
        DataMsg::PublisherPut {
            id,
            payload,
            attachment,
            encoding,
            timestamp,
        } => {
            if let Some(publisher) = state_map.publishers.get(&id) {
                let mut put_builder = match payload.b64_to_bytes() {
                    Ok(payload) => publisher.put(payload),
                    Err(err) => {
                        warn!("DataMsg::PublisherPut : Could not decode B64 encoded bytes {err}");
                        return Err(Box::new(err));
                    }
                };

                if let Some(attachment_b64) = attachment {
                    match attachment_b64.b64_to_bytes() {
                        Ok(payload) => put_builder = put_builder.attachment(payload),
                        Err(err) => {
                            warn!(
                                "DataMsg::PublisherPut : Could not decode B64 encoded bytes {err}"
                            );
                            return Err(Box::new(err));
                        }
                    }
                }
                if let Some(encoding) = encoding {
                    put_builder = put_builder.encoding(encoding);
                }
                if let Some(ts) = timestamp.and_then(|k| state_map.timestamps.get(&k)) {
                    put_builder = put_builder.timestamp(*ts);
                }
                if let Err(err) = put_builder.await {
                    error!("PublisherPut {id}, {err}");
                }
            } else {
                warn!("Publisher {id}, does not exist in State");
            }
        }
        DataMsg::PublisherDelete {
            id,
            attachment,
            timestamp,
        } => {
            if let Some(publisher) = state_map.publishers.get(&id) {
                let mut publisher_builder = publisher.delete();
                match attachment.map(|x| x.b64_to_bytes()) {
                    Some(Ok(attachment)) => {
                        publisher_builder = publisher_builder.attachment(&attachment);
                    }
                    Some(Err(e)) => {
                        error!("{}", e);
                    }
                    None => {}
                }
                if let Some(ts) = timestamp.and_then(|k| state_map.timestamps.get(&k)) {
                    publisher_builder = publisher_builder.timestamp(*ts);
                }

                if let Err(e) = publisher_builder.await {
                    error!("Could not publish {e}");
                };
            }
        }
        DataMsg::Queryable(queryable_msg) => match queryable_msg {
            QueryableMsg::Reply { reply } => {
                let query: Option<Query> = match state_map.unanswered_queries.write() {
                    Ok(mut wr) => wr.remove(&reply.query_uuid),
                    Err(err) => {
                        tracing::error!("unanswered Queries RwLock Poisoned {err}");
                        return Ok(());
                    }
                };
                if let Some(q) = query {
                    match reply.result {
                        QueryReplyVariant::Reply {
                            key_expr,
                            payload,
                            encoding,
                            priority,
                            congestion_control,
                            express,
                            timestamp,
                            attachment,
                        } => match payload.b64_to_bytes() {
                            Ok(payload) => {
                                let priority = match priority.try_into() {
                                    Ok(p) => p,
                                    Err(e) => {
                                        warn!("DataMsg::QueryReplyVariant::Reply : Could not convert value {priority} to Priority: {}", e);
                                        Priority::default()
                                    }
                                };
                                let congestion_control = if congestion_control == 0 {
                                    CongestionControl::Drop
                                } else if congestion_control == 1 {
                                    CongestionControl::Block
                                } else {
                                    warn!("DataMsg::QueryReplyVariant::Reply : Could not convert value {congestion_control} to CongestionControl:");
                                    CongestionControl::default()
                                };
                                let mut builder = q
                                    .reply(key_expr, payload)
                                    .priority(priority)
                                    .congestion_control(congestion_control)
                                    .express(express);
                                if let Some(encoding) = encoding {
                                    builder = builder.encoding(encoding);
                                }
                                if let Some(attachment_b64) = attachment {
                                    match attachment_b64.b64_to_bytes() {
                                        Ok(payload) => builder = builder.attachment(payload),
                                        Err(err) => {
                                            warn!(
                                                "DataMsg::QueryReplyVariant::Reply : Could not decode B64 encoded bytes {err}"
                                            );
                                            return Err(Box::new(err));
                                        }
                                    }
                                }
                                if let Some(timestamp) =
                                    timestamp.and_then(|k| state_map.timestamps.get(&k))
                                {
                                    builder = builder.timestamp(*timestamp);
                                }
                                builder.await?
                            }
                            Err(err) => {
                                warn!("QueryReplyVariant::Reply : Could not decode B64 encoded bytes {err}");
                                return Err(Box::new(err));
                            }
                        },
                        QueryReplyVariant::ReplyErr { payload, encoding } => {
                            match payload.b64_to_bytes() {
                                Ok(payload) => {
                                    let mut builder = q.reply_err(payload);
                                    if let Some(encoding) = encoding {
                                        builder = builder.encoding(encoding);
                                    }
                                    builder.await?
                                }
                                Err(err) => {
                                    warn!("QueryReplyVariant::ReplyErr : Could not decode B64 encoded bytes {err}");
                                    return Err(Box::new(err));
                                }
                            }
                        }
                        QueryReplyVariant::ReplyDelete {
                            key_expr,
                            priority,
                            congestion_control,
                            express,
                            timestamp,
                            attachment,
                        } => {
                            let priority = priority.try_into().unwrap_or({
                                warn!("DataMsg::QueryReplyVariant::ReplyDelete : Could not convert value {priority} to Priority:");
                                Priority::default()
                            });
                            let congestion_control = if congestion_control == 0 {
                                CongestionControl::Drop
                            } else if congestion_control == 1 {
                                CongestionControl::Block
                            } else {
                                warn!("DataMsg::QueryReplyVariant::ReplyDelete : Could not convert value {congestion_control} to CongestionControl:");
                                CongestionControl::default()
                            };
                            let mut builder = q
                                .reply_del(key_expr)
                                .priority(priority)
                                .congestion_control(congestion_control)
                                .express(express);
                            if let Some(attachment_b64) = attachment {
                                match attachment_b64.b64_to_bytes() {
                                    Ok(payload) => builder = builder.attachment(payload),
                                    Err(err) => {
                                        warn!(
                                            "DataMsg::QueryReplyVariant::ReplyDelete : Could not decode B64 encoded bytes {err}"
                                        );
                                        return Err(Box::new(err));
                                    }
                                }
                            }
                            if let Some(timestamp) =
                                timestamp.and_then(|k| state_map.timestamps.get(&k))
                            {
                                builder = builder.timestamp(*timestamp);
                            }
                            builder.await?
                        }
                    }
                } else {
                    tracing::error!("Query id not found in map {}", reply.query_uuid);
                };
            }
            QueryableMsg::Query {
                queryable_uuid: _,
                query: _,
            } => {
                warn!("Plugin should not receive Query from Client, This should go via Get API");
            }
        },
        DataMsg::Sample(_, _)
        | DataMsg::GetReply(_)
        | DataMsg::NewTimestamp {
            id: _,
            string_rep: _,
            millis_since_epoch: _,
        }
        | DataMsg::SessionInfo(_) => {
            error!("Server Should not recieved a {data_msg:?} Variant from client");
        }
    }
    Ok(())
}
