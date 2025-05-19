//
// Copyright (c) 2025 ZettaScale Technology
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

use core::str;
use std::{ops::Not, str::FromStr};

use uhlc::{Timestamp, NTP64};
use uuid::Uuid;
use zenoh::{
    bytes::{Encoding, ZBytes},
    config::ZenohId,
    key_expr::OwnedKeyExpr,
    qos::{CongestionControl, Priority, Reliability},
    query::{ConsolidationMode, QueryTarget, ReplyKeyExpr},
    sample::Locality,
};

use zenoh_ext::{Deserialize, Serialize, ZDeserializeError, ZDeserializer, ZSerializer};
use zenoh_result::bail;

pub(crate) fn serialize_option<T: Sized + Serialize>(serializer: &mut ZSerializer, o: &Option<T>) {
    match o {
        Some(v) => {
            serializer.serialize(true);
            serializer.serialize(v);
        }
        None => {
            serializer.serialize(false);
        }
    }
}

pub(crate) fn deserialize_option<T: Sized + Deserialize>(
    deserializer: &mut zenoh_ext::ZDeserializer,
) -> Result<Option<T>, ZDeserializeError> {
    let has_value = deserializer.deserialize::<bool>()?;
    match has_value {
        true => Ok(Some(deserializer.deserialize()?)),
        false => Ok(None),
    }
}

pub(crate) struct OpenSession {
    pub(crate) id: Uuid,
}

impl OpenSession {
    pub(crate) fn from_wire(data: ZBytes) -> Result<OpenSession, zenoh_result::Error> {
        let mut deserializer = ZDeserializer::new(&data);
        Ok(OpenSession {
            id: Uuid::from_str(&deserializer.deserialize::<String>()?)?,
        })
    }
}

pub(crate) struct CloseSession {
    pub(crate) id: Uuid,
}

impl CloseSession {
    pub(crate) fn from_wire(data: ZBytes) -> Result<CloseSession, zenoh_result::Error> {
        let mut deserializer = ZDeserializer::new(&data);
        Ok(CloseSession {
            id: Uuid::from_str(&deserializer.deserialize::<String>()?)?,
        })
    }
}

pub(crate) struct ResultWithId<T: Sized + Serialize> {
    pub(crate) id: T,
    pub(crate) error: Option<String>,
}

impl<T: Sized + Serialize> ResultWithId<T> {
    pub(crate) fn to_wire(&self) -> ZBytes {
        let mut serializer = ZSerializer::new();
        serializer.serialize(&self.id);
        serialize_option(&mut serializer, &self.error);
        serializer.finish()
    }
}

fn congestion_control_from_u8(c: u8) -> Result<CongestionControl, zenoh_result::Error> {
    match c {
        0 => Ok(CongestionControl::Drop),
        1 => Ok(CongestionControl::Block),
        v => bail!("Unsupported congestion control value {}", v),
    }
}

fn congestion_control_to_u8(c: CongestionControl) -> u8 {
    match c {
        CongestionControl::Drop => 0,
        CongestionControl::Block => 1,
    }
}

fn priority_from_u8(p: u8) -> Result<Priority, zenoh_result::Error> {
    p.try_into()
}

fn priority_to_u8(p: Priority) -> u8 {
    p as u8
}

fn reliability_from_u8(r: u8) -> Result<Reliability, zenoh_result::Error> {
    match r {
        0 => Ok(Reliability::BestEffort),
        1 => Ok(Reliability::Reliable),
        v => bail!("Unsupported reliability value {}", v),
    }
}

fn reliability_to_u8(r: Reliability) -> u8 {
    match r {
        Reliability::BestEffort => 0,
        Reliability::Reliable => 1,
    }
}

fn locality_from_u8(l: u8) -> Result<Locality, zenoh_result::Error> {
    match l {
        0 => Ok(Locality::Any),
        1 => Ok(Locality::Remote),
        2 => Ok(Locality::SessionLocal),
        v => bail!("Unsupported locality value {}", v),
    }
}

fn consolidation_from_u8(l: u8) -> Result<ConsolidationMode, zenoh_result::Error> {
    match l {
        0 => Ok(ConsolidationMode::Auto),
        1 => Ok(ConsolidationMode::None),
        2 => Ok(ConsolidationMode::Monotonic),
        3 => Ok(ConsolidationMode::Latest),
        v => bail!("Unsupported consolidation mode value {}", v),
    }
}

fn query_target_from_u8(t: u8) -> Result<QueryTarget, zenoh_result::Error> {
    match t {
        0 => Ok(QueryTarget::All),
        1 => Ok(QueryTarget::AllComplete),
        2 => Ok(QueryTarget::BestMatching),
        v => bail!("Unsupported query target value {}", v),
    }
}

fn reply_keyexpr_from_u8(a: u8) -> Result<ReplyKeyExpr, zenoh_result::Error> {
    match a {
        0 => Ok(ReplyKeyExpr::Any),
        1 => Ok(ReplyKeyExpr::MatchingQuery),
        v => bail!("Unsupported reply keyexpr value {}", v),
    }
}

fn reply_keyexpr_to_u8(a: ReplyKeyExpr) -> u8 {
    match a {
        ReplyKeyExpr::Any => 0,
        ReplyKeyExpr::MatchingQuery => 1,
    }
}

fn encoding_from_id_schema(id_schema: (u16, String)) -> Encoding {
    Encoding::new(
        id_schema.0,
        id_schema
            .1
            .is_empty()
            .not()
            .then(|| id_schema.1.into_bytes().into()),
    )
}

fn encoding_to_id_schema(encoding: &Encoding) -> (u16, &[u8]) {
    (
        encoding.id(),
        match encoding.schema() {
            Some(s) => s.as_slice(),
            None => &[],
        },
    )
}

fn opt_encoding_from_id_schema(id_schema: Option<(u16, String)>) -> Option<Encoding> {
    id_schema.map(|x| encoding_from_id_schema(x))
}

fn opt_timestamp_from_ntp_id(
    ntp_id: Option<(u64, [u8; 16])>,
) -> Result<Option<Timestamp>, zenoh_result::Error> {
    Ok(match ntp_id {
        Some((t, id)) => Some(Timestamp::new(NTP64(t), id.try_into()?)),
        None => None,
    })
}

fn timestamp_to_ntp_id(t: &Timestamp) -> (u64, [u8; 16]) {
    (t.get_time().0, t.get_id().to_le_bytes())
}

pub(crate) struct DeclarePublisher {
    pub(crate) id: u32,
    pub(crate) keyexpr: OwnedKeyExpr,
    pub(crate) encoding: Encoding,
    pub(crate) congestion_control: CongestionControl,
    pub(crate) priority: Priority,
    pub(crate) express: bool,
    pub(crate) reliability: Reliability,
    pub(crate) allowed_destination: Locality,
}

impl DeclarePublisher {
    pub(crate) fn from_wire(data: ZBytes) -> Result<Self, zenoh_result::Error> {
        let mut deserializer = ZDeserializer::new(&data);
        Ok(DeclarePublisher {
            id: deserializer.deserialize::<u32>()?,
            keyexpr: OwnedKeyExpr::try_from(deserializer.deserialize::<String>()?)?,
            encoding: encoding_from_id_schema(deserializer.deserialize()?),
            congestion_control: congestion_control_from_u8(deserializer.deserialize()?)?,
            priority: priority_from_u8(deserializer.deserialize()?)?,
            express: deserializer.deserialize()?,
            reliability: reliability_from_u8(deserializer.deserialize()?)?,
            allowed_destination: locality_from_u8(deserializer.deserialize()?)?,
        })
    }
}

pub(crate) struct UndeclarePublisher {
    pub(crate) id: u32,
}

impl UndeclarePublisher {
    pub(crate) fn from_wire(data: ZBytes) -> Result<Self, zenoh_result::Error> {
        let mut deserializer = ZDeserializer::new(&data);
        Ok(UndeclarePublisher {
            id: deserializer.deserialize::<u32>()?,
        })
    }
}

pub(crate) struct DeclareSubscriber {
    pub(crate) id: u32,
    pub(crate) keyexpr: OwnedKeyExpr,
    pub(crate) allowed_origin: Locality,
}

impl DeclareSubscriber {
    pub(crate) fn from_wire(data: ZBytes) -> Result<Self, zenoh_result::Error> {
        let mut deserializer = ZDeserializer::new(&data);
        Ok(DeclareSubscriber {
            id: deserializer.deserialize::<u32>()?,
            keyexpr: OwnedKeyExpr::try_from(deserializer.deserialize::<String>()?)?,
            allowed_origin: locality_from_u8(deserializer.deserialize()?)?,
        })
    }
}

pub(crate) struct UndeclareSubscriber {
    pub(crate) id: u32,
}

impl UndeclareSubscriber {
    pub(crate) fn from_wire(data: ZBytes) -> Result<Self, zenoh_result::Error> {
        let mut deserializer = ZDeserializer::new(&data);
        Ok(UndeclareSubscriber {
            id: deserializer.deserialize::<u32>()?,
        })
    }
}

pub(crate) struct DeclareQueryable {
    pub(crate) id: u32,
    pub(crate) keyexpr: OwnedKeyExpr,
    pub(crate) complete: bool,
    pub(crate) allowed_origin: Locality,
}

impl DeclareQueryable {
    pub(crate) fn from_wire(data: ZBytes) -> Result<Self, zenoh_result::Error> {
        let mut deserializer = ZDeserializer::new(&data);
        Ok(DeclareQueryable {
            id: deserializer.deserialize::<u32>()?,
            keyexpr: OwnedKeyExpr::try_from(deserializer.deserialize::<String>()?)?,
            complete: deserializer.deserialize()?,
            allowed_origin: locality_from_u8(deserializer.deserialize()?)?,
        })
    }
}

pub(crate) struct UndeclareQueryable {
    pub(crate) id: u32,
}

impl UndeclareQueryable {
    pub(crate) fn from_wire(data: ZBytes) -> Result<Self, zenoh_result::Error> {
        let mut deserializer = ZDeserializer::new(&data);
        Ok(UndeclareQueryable {
            id: deserializer.deserialize::<u32>()?,
        })
    }
}

pub(crate) struct DeclareQuerier {
    pub(crate) id: u32,
    pub(crate) keyexpr: OwnedKeyExpr,
    pub(crate) target: QueryTarget,
    pub(crate) accept_replies: ReplyKeyExpr,
    pub(crate) timeout_ms: u64,
    pub(crate) consolidation: ConsolidationMode,
    pub(crate) congestion_control: CongestionControl,
    pub(crate) priority: Priority,
    pub(crate) express: bool,
    pub(crate) reliability: Reliability,
    pub(crate) allowed_destination: Locality,
}

impl DeclareQuerier {
    pub(crate) fn from_wire(data: ZBytes) -> Result<Self, zenoh_result::Error> {
        let mut deserializer = ZDeserializer::new(&data);
        Ok(DeclareQuerier {
            id: deserializer.deserialize::<u32>()?,
            keyexpr: OwnedKeyExpr::try_from(deserializer.deserialize::<String>()?)?,
            target: query_target_from_u8(deserializer.deserialize()?)?,
            accept_replies: reply_keyexpr_from_u8(deserializer.deserialize()?)?,
            timeout_ms: deserializer.deserialize()?,
            consolidation: consolidation_from_u8(deserializer.deserialize()?)?,
            congestion_control: congestion_control_from_u8(deserializer.deserialize()?)?,
            priority: priority_from_u8(deserializer.deserialize()?)?,
            express: deserializer.deserialize()?,
            reliability: reliability_from_u8(deserializer.deserialize()?)?,
            allowed_destination: locality_from_u8(deserializer.deserialize()?)?,
        })
    }
}

pub(crate) struct UndeclareQuerier {
    pub(crate) id: u32,
}

impl UndeclareQuerier {
    pub(crate) fn from_wire(data: ZBytes) -> Result<Self, zenoh_result::Error> {
        let mut deserializer = ZDeserializer::new(&data);
        Ok(UndeclareQuerier {
            id: deserializer.deserialize::<u32>()?,
        })
    }
}

pub(crate) struct GetSessionInfo {
    pub(crate) id: u32,
}

impl GetSessionInfo {
    pub(crate) fn from_wire(data: ZBytes) -> Result<Self, zenoh_result::Error> {
        let mut deserializer = ZDeserializer::new(&data);
        Ok(GetSessionInfo {
            id: deserializer.deserialize::<u32>()?,
        })
    }
}

pub(crate) struct ResponseSessionInfo {
    pub(crate) id: u32,
    pub(crate) zid: ZenohId,
    pub(crate) z_routers: Vec<ZenohId>,
    pub(crate) z_peers: Vec<ZenohId>,
}

impl ResponseSessionInfo {
    pub(crate) fn to_wire(&self) -> ZBytes {
        let mut serializer = ZSerializer::new();
        serializer.serialize(self.id);
        serializer.serialize(self.zid.to_le_bytes());
        serializer.serialize_iter(self.z_routers.iter().map(|z| z.to_le_bytes()));
        serializer.serialize_iter(self.z_peers.iter().map(|z| z.to_le_bytes()));
        serializer.finish()
    }
}

pub(crate) struct GetTimestamp {
    pub(crate) id: u32,
}

impl GetTimestamp {
    pub(crate) fn from_wire(data: ZBytes) -> Result<Self, zenoh_result::Error> {
        let mut deserializer = ZDeserializer::new(&data);
        Ok(GetTimestamp {
            id: deserializer.deserialize::<u32>()?,
        })
    }
}

pub(crate) struct ResponseTimestamp {
    pub(crate) id: u32,
    pub(crate) timestamp: Timestamp,
}

impl ResponseTimestamp {
    pub(crate) fn to_wire(&self) -> ZBytes {
        let mut serializer = ZSerializer::new();
        serializer.serialize(&self.id);
        serializer.serialize(timestamp_to_ntp_id(&self.timestamp));
        serializer.finish()
    }
}

pub(crate) struct Put {
    pub(crate) keyexpr: OwnedKeyExpr,
    pub(crate) payload: Vec<u8>,
    pub(crate) encoding: Encoding,
    pub(crate) attachment: Option<Vec<u8>>,
    pub(crate) timestamp: Option<Timestamp>,
    pub(crate) congestion_control: CongestionControl,
    pub(crate) priority: Priority,
    pub(crate) express: bool,
    pub(crate) reliability: Reliability,
    pub(crate) allowed_destination: Locality,
}

impl Put {
    pub(crate) fn from_wire(data: ZBytes) -> Result<Self, zenoh_result::Error> {
        let mut deserializer = ZDeserializer::new(&data);
        Ok(Put {
            keyexpr: OwnedKeyExpr::try_from(deserializer.deserialize::<String>()?)?,
            payload: deserializer.deserialize()?,
            encoding: encoding_from_id_schema(deserializer.deserialize()?),
            attachment: deserialize_option(&mut deserializer)?,
            timestamp: opt_timestamp_from_ntp_id(deserialize_option(&mut deserializer)?)?,
            congestion_control: congestion_control_from_u8(deserializer.deserialize()?)?,
            priority: priority_from_u8(deserializer.deserialize()?)?,
            express: deserializer.deserialize()?,
            reliability: reliability_from_u8(deserializer.deserialize()?)?,
            allowed_destination: locality_from_u8(deserializer.deserialize()?)?,
        })
    }
}

pub(crate) struct PublisherPut {
    pub(crate) publisher_id: u32,
    pub(crate) payload: Vec<u8>,
    pub(crate) encoding: Encoding,
    pub(crate) attachment: Option<Vec<u8>>,
    pub(crate) timestamp: Option<Timestamp>,
}

impl PublisherPut {
    pub(crate) fn from_wire(data: ZBytes) -> Result<Self, zenoh_result::Error> {
        let mut deserializer = ZDeserializer::new(&data);
        Ok(PublisherPut {
            publisher_id: deserializer.deserialize()?,
            payload: deserializer.deserialize()?,
            encoding: encoding_from_id_schema(deserializer.deserialize()?),
            attachment: deserialize_option(&mut deserializer)?,
            timestamp: opt_timestamp_from_ntp_id(deserialize_option(&mut deserializer)?)?,
        })
    }
}

pub(crate) struct Get {
    pub(crate) id: u32,
    pub(crate) keyexpr: OwnedKeyExpr,
    pub(crate) parameters: Option<String>,
    pub(crate) payload: Option<Vec<u8>>,
    pub(crate) encoding: Option<Encoding>,
    pub(crate) attachment: Option<Vec<u8>>,
    pub(crate) target: QueryTarget,
    pub(crate) accept_replies: ReplyKeyExpr,
    pub(crate) timeout_ms: u64,
    pub(crate) consolidation: ConsolidationMode,
    pub(crate) congestion_control: CongestionControl,
    pub(crate) priority: Priority,
    pub(crate) express: bool,
    pub(crate) reliability: Reliability,
    pub(crate) allowed_destination: Locality,
}

impl Get {
    pub(crate) fn from_wire(data: ZBytes) -> Result<Self, zenoh_result::Error> {
        let mut deserializer = ZDeserializer::new(&data);
        Ok(Get {
            id: deserializer.deserialize()?,
            keyexpr: OwnedKeyExpr::try_from(deserializer.deserialize::<String>()?)?,
            parameters: deserialize_option(&mut deserializer)?,
            payload: deserialize_option(&mut deserializer)?,
            encoding: opt_encoding_from_id_schema(deserialize_option(&mut deserializer)?),
            attachment: deserialize_option(&mut deserializer)?,
            target: query_target_from_u8(deserializer.deserialize()?)?,
            accept_replies: reply_keyexpr_from_u8(deserializer.deserialize()?)?,
            timeout_ms: deserializer.deserialize()?,
            consolidation: consolidation_from_u8(deserializer.deserialize()?)?,
            congestion_control: congestion_control_from_u8(deserializer.deserialize()?)?,
            priority: priority_from_u8(deserializer.deserialize()?)?,
            express: deserializer.deserialize()?,
            reliability: reliability_from_u8(deserializer.deserialize()?)?,
            allowed_destination: locality_from_u8(deserializer.deserialize()?)?,
        })
    }
}

pub(crate) struct QuerierGet {
    pub(crate) querier_id: u32,
    pub(crate) id: u32,
    pub(crate) parameters: Option<String>,
    pub(crate) payload: Option<Vec<u8>>,
    pub(crate) encoding: Option<Encoding>,
    pub(crate) attachment: Option<Vec<u8>>,
}

impl QuerierGet {
    pub(crate) fn from_wire(data: ZBytes) -> Result<Self, zenoh_result::Error> {
        let mut deserializer = ZDeserializer::new(&data);
        Ok(QuerierGet {
            querier_id: deserializer.deserialize()?,
            id: deserializer.deserialize()?,
            parameters: deserialize_option(&mut deserializer)?,
            payload: deserialize_option(&mut deserializer)?,
            encoding: opt_encoding_from_id_schema(deserialize_option(&mut deserializer)?),
            attachment: deserialize_option(&mut deserializer)?,
        })
    }
}

fn serialize_sample(serializer: &mut ZSerializer, sample: &zenoh::sample::Sample) {
    serializer.serialize(sample.key_expr().as_str());
    serializer.serialize(sample.payload().to_bytes());
    serializer.serialize(encoding_to_id_schema(sample.encoding()));
    serialize_option(serializer, &sample.attachment().map(|a| a.to_bytes()));
    serialize_option(
        serializer,
        &sample.timestamp().map(|t| timestamp_to_ntp_id(t)),
    );
    serializer.serialize(congestion_control_to_u8(sample.congestion_control()));
    serializer.serialize(priority_to_u8(sample.priority()));
    serializer.serialize(sample.express());
    serializer.serialize(reliability_to_u8(sample.reliability()));
}

pub(crate) struct Sample {
    pub(crate) subscriber_id: u32,
    pub(crate) sample: zenoh::sample::Sample,
}

impl Sample {
    pub(crate) fn to_wire(&self) -> ZBytes {
        let mut serializer = ZSerializer::new();
        serializer.serialize(&self.subscriber_id);
        serialize_sample(&mut serializer, &self.sample);

        serializer.finish()
    }
}

pub(crate) struct Query {
    pub(crate) queryable_id: u32,
    pub(crate) query_id: u32,
    pub(crate) query: zenoh::query::Query,
}

fn serialize_query(serializer: &mut ZSerializer, query: &zenoh::query::Query) {
    serializer.serialize(query.key_expr().as_str());
    serializer.serialize(query.parameters().as_str());
    serialize_option(serializer, &query.payload().map(|p| p.to_bytes()));
    serialize_option(
        serializer,
        &query.encoding().map(|e| encoding_to_id_schema(e)),
    );
    serialize_option(serializer, &query.attachment().map(|a| a.to_bytes()));
    serializer.serialize(reply_keyexpr_to_u8(
        query
            .accepts_replies()
            .unwrap_or(ReplyKeyExpr::MatchingQuery),
    ));
}

impl Query {
    pub(crate) fn to_wire(&self) -> ZBytes {
        let mut serializer = ZSerializer::new();
        serializer.serialize(&self.queryable_id);
        serializer.serialize(&self.query_id);
        serialize_query(&mut serializer, &self.query);

        serializer.finish()
    }
}

pub(crate) struct Reply {
    pub(crate) query_id: u32,
    pub(crate) reply: zenoh::query::Reply,
}

fn serialize_reply(serializer: &mut ZSerializer, reply: &zenoh::query::Reply) {
    match reply.result() {
        Ok(r) => {
            serializer.serialize(true);
            serialize_sample(serializer, r);
        }
        Err(e) => {
            serializer.serialize(false);
            serializer.serialize(encoding_to_id_schema(e.encoding()));
            serializer.serialize(e.payload().to_bytes());
        }
    }
}

impl Reply {
    pub(crate) fn to_wire(&self) -> ZBytes {
        let mut serializer = ZSerializer::new();
        serializer.serialize(&self.query_id);
        serialize_reply(&mut serializer, &self.reply);

        serializer.finish()
    }
}

pub(crate) struct ResponseFinal {
    query_id: u32,
}

impl ResponseFinal {
    pub(crate) fn to_wire(&self) -> ZBytes {
        let mut serializer = ZSerializer::new();
        serializer.serialize(&self.query_id);
        serializer.finish()
    }

    pub(crate) fn from_wire(data: ZBytes) -> Result<ResponseFinal, zenoh_result::Error> {
        let mut deserializer = ZDeserializer::new(&data);
        Ok(ResponseFinal {
            query_id: deserializer.deserialize()?,
        })
    }
}

pub(crate) struct DeclareLivelinessToken {
    pub(crate) token_id: u32,
}

impl DeclareLivelinessToken {
    pub(crate) fn from_wire(data: ZBytes) -> Result<DeclareLivelinessToken, zenoh_result::Error> {
        let mut deserializer = ZDeserializer::new(&data);
        Ok(DeclareLivelinessToken {
            token_id: deserializer.deserialize()?,
        })
    }
}

pub(crate) struct UndeclareLivelinessToken {
    pub(crate) token_id: u32,
}

impl UndeclareLivelinessToken {
    pub(crate) fn to_wire(&self) -> ZBytes {
        let mut serializer = ZSerializer::new();
        serializer.serialize(&self.token_id);
        serializer.finish()
    }
}

pub(crate) struct DeclareLivelinessSubscriber {
    pub(crate) subscriber_id: u32,
    pub(crate) keyexpr: OwnedKeyExpr,
    pub(crate) history: bool,
}

impl DeclareLivelinessSubscriber {
    pub(crate) fn from_wire(
        data: ZBytes,
    ) -> Result<DeclareLivelinessSubscriber, zenoh_result::Error> {
        let mut deserializer = ZDeserializer::new(&data);
        Ok(DeclareLivelinessSubscriber {
            subscriber_id: deserializer.deserialize()?,
            keyexpr: OwnedKeyExpr::try_from(deserializer.deserialize::<String>()?)?,
            history: deserializer.deserialize()?,
        })
    }
}

pub(crate) struct UndeclareLivelinessSubscriber {
    pub(crate) subscriber_id: u32,
}

impl UndeclareLivelinessSubscriber {
    pub(crate) fn to_wire(&self) -> ZBytes {
        let mut serializer = ZSerializer::new();
        serializer.serialize(&self.subscriber_id);
        serializer.finish()
    }
}

pub(crate) struct LivelinessGet {
    pub(crate) id: u32,
    pub(crate) keyexpr: OwnedKeyExpr,
    pub(crate) timeout_ms: u64,
}

impl LivelinessGet {
    pub(crate) fn from_wire(data: ZBytes) -> Result<Self, zenoh_result::Error> {
        let mut deserializer = ZDeserializer::new(&data);
        Ok(LivelinessGet {
            id: deserializer.deserialize()?,
            keyexpr: OwnedKeyExpr::try_from(deserializer.deserialize::<String>()?)?,
            timeout_ms: deserializer.deserialize()?,
        })
    }
}
