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

use std::ops::Not;

use uhlc::{Timestamp, NTP64};
use zenoh::{
    bytes::{Encoding, ZBytes},
    config::ZenohId,
    key_expr::OwnedKeyExpr,
    qos::{CongestionControl, Priority, Reliability},
    query::{ConsolidationMode, QueryTarget, ReplyKeyExpr},
    sample::{Locality, SampleKind},
};
use zenoh_ext::{Deserialize, Serialize, ZDeserializeError, ZDeserializer, ZSerializer};
use zenoh_result::bail;

pub(crate) type SequenceId = u32;

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

pub(crate) struct Error {
    pub(crate) error: String,
}

impl Error {
    pub(crate) fn to_wire(&self, serializer: &mut ZSerializer) {
        serializer.serialize(&self.error);
    }
}

pub(crate) struct Ok {
    pub(crate) content_id: InRemoteMessageId,
}

impl Ok {
    pub(crate) fn to_wire(&self, serializer: &mut ZSerializer) {
        serializer.serialize(self.content_id as u8);
    }
}

pub(crate) struct Qos {
    inner: u8,
}

impl Qos {
    pub(crate) fn new(
        priority: Priority,
        congestion_control: CongestionControl,
        express: bool,
        reliability: Reliability,
        locality: Locality,
    ) -> Self {
        let p = priority as u8;
        let c = match congestion_control {
            CongestionControl::Drop => 0u8,
            CongestionControl::Block => 1u8,
        };
        let e = match express {
            true => 1u8,
            false => 0u8,
        };
        let r = match reliability {
            Reliability::BestEffort => 0u8,
            Reliability::Reliable => 1u8,
        };
        let l = match locality {
            Locality::SessionLocal => 0u8,
            Locality::Remote => 1u8,
            Locality::Any => 2u8,
        };
        // llrecppp
        Self {
            inner: p | (c << 3) | (e << 4) | (r << 5) | (l << 6),
        }
    }

    pub(crate) fn priority(&self) -> Priority {
        let p = self.inner & 0b111u8;
        p.try_into().unwrap_or_default()
    }

    pub(crate) fn congestion_control(&self) -> CongestionControl {
        let c = (self.inner >> 3) & 1u8;
        match c == 0 {
            true => CongestionControl::Drop,
            false => CongestionControl::Block,
        }
    }

    pub(crate) fn express(&self) -> bool {
        let e = (self.inner >> 4) & 1u8;
        e > 0
    }

    pub(crate) fn reliability(&self) -> Reliability {
        let r = (self.inner >> 5) & 1u8;
        match r == 0 {
            true => Reliability::BestEffort,
            false => Reliability::Reliable,
        }
    }

    pub(crate) fn locality(&self) -> Locality {
        let l = (self.inner >> 6) & 0b11u8;
        match l {
            0u8 => Locality::SessionLocal,
            1u8 => Locality::Remote,
            2u8 => Locality::Any,
            _ => Locality::default(),
        }
    }
}

impl Serialize for Qos {
    fn serialize(&self, serializer: &mut ZSerializer) {
        serializer.serialize(self.inner);
    }
}

impl Deserialize for Qos {
    fn deserialize(deserializer: &mut ZDeserializer) -> Result<Self, ZDeserializeError> {
        Ok(Self {
            inner: deserializer.deserialize()?,
        })
    }
}

pub(crate) struct QuerySettings {
    inner: u8,
}

impl QuerySettings {
    #[allow(dead_code)]
    pub(crate) fn new(
        target: QueryTarget,
        consolidation: ConsolidationMode,
        reply_keyexpr: ReplyKeyExpr,
    ) -> Self {
        let t = match target {
            QueryTarget::BestMatching => 0u8,
            QueryTarget::All => 1u8,
            QueryTarget::AllComplete => 2u8,
        };
        let c = match consolidation {
            ConsolidationMode::Auto => 0u8,
            ConsolidationMode::None => 1u8,
            ConsolidationMode::Monotonic => 2u8,
            ConsolidationMode::Latest => 3u8,
        };
        let r = match reply_keyexpr {
            ReplyKeyExpr::Any => 0u8,
            ReplyKeyExpr::MatchingQuery => 1u8,
        };

        // rcctt
        Self {
            inner: t | (c << 2) | (r << 4),
        }
    }

    pub(crate) fn target(&self) -> QueryTarget {
        let t = self.inner & 0b11u8;
        match t {
            0 => QueryTarget::All,
            1 => QueryTarget::AllComplete,
            2 => QueryTarget::BestMatching,
            _ => QueryTarget::default(),
        }
    }

    pub(crate) fn consolidation(&self) -> ConsolidationMode {
        let c = (self.inner >> 2) & 0b11u8;
        match c {
            0 => ConsolidationMode::Auto,
            1 => ConsolidationMode::None,
            2 => ConsolidationMode::Monotonic,
            3 => ConsolidationMode::Latest,
            _ => ConsolidationMode::default(),
        }
    }

    pub(crate) fn reply_keyexpr(&self) -> ReplyKeyExpr {
        let r = (self.inner >> 4) & 1u8;
        match r == 0 {
            true => ReplyKeyExpr::Any,
            false => ReplyKeyExpr::MatchingQuery,
        }
    }
}

fn locality_from_u8(l: u8) -> Result<Locality, zenoh_result::Error> {
    match l {
        0 => Ok(Locality::SessionLocal),
        1 => Ok(Locality::Remote),
        2 => Ok(Locality::Any),
        v => bail!("Unsupported locality value {}", v),
    }
}

fn reply_keyexpr_to_u8(a: ReplyKeyExpr) -> u8 {
    match a {
        ReplyKeyExpr::Any => 0,
        ReplyKeyExpr::MatchingQuery => 1,
    }
}

impl Serialize for QuerySettings {
    fn serialize(&self, serializer: &mut ZSerializer) {
        serializer.serialize(self.inner);
    }
}

impl Deserialize for QuerySettings {
    fn deserialize(deserializer: &mut ZDeserializer) -> Result<Self, ZDeserializeError> {
        Ok(Self {
            inner: deserializer.deserialize()?,
        })
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
    id_schema.map(encoding_from_id_schema)
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

fn sample_kind_to_u8(k: SampleKind) -> u8 {
    match k {
        SampleKind::Put => 0,
        SampleKind::Delete => 1,
    }
}

pub(crate) struct Ping {}

impl Ping {
    pub(crate) fn from_wire(
        _deserializer: &mut ZDeserializer,
    ) -> Result<Self, zenoh_result::Error> {
        Ok(Self {})
    }
}

pub(crate) struct PingAck {
    pub(crate) uuid: String,
}

impl PingAck {
    pub(crate) fn to_wire(&self, serializer: &mut ZSerializer) {
        serializer.serialize(&self.uuid);
    }
}

pub(crate) struct DeclarePublisher {
    pub(crate) id: u32,
    pub(crate) keyexpr: OwnedKeyExpr,
    pub(crate) encoding: Encoding,
    pub(crate) qos: Qos,
}

impl DeclarePublisher {
    pub(crate) fn from_wire(deserializer: &mut ZDeserializer) -> Result<Self, zenoh_result::Error> {
        Ok(DeclarePublisher {
            id: deserializer.deserialize()?,
            keyexpr: OwnedKeyExpr::try_from(deserializer.deserialize::<String>()?)?,
            encoding: encoding_from_id_schema(deserializer.deserialize()?),
            qos: deserializer.deserialize()?,
        })
    }
}

pub(crate) struct UndeclarePublisher {
    pub(crate) id: u32,
}

impl UndeclarePublisher {
    pub(crate) fn from_wire(deserializer: &mut ZDeserializer) -> Result<Self, zenoh_result::Error> {
        Ok(UndeclarePublisher {
            id: deserializer.deserialize()?,
        })
    }
}

pub(crate) struct DeclareSubscriber {
    pub(crate) id: u32,
    pub(crate) keyexpr: OwnedKeyExpr,
    pub(crate) allowed_origin: Locality,
}

impl DeclareSubscriber {
    pub(crate) fn from_wire(deserializer: &mut ZDeserializer) -> Result<Self, zenoh_result::Error> {
        Ok(DeclareSubscriber {
            id: deserializer.deserialize()?,
            keyexpr: OwnedKeyExpr::try_from(deserializer.deserialize::<String>()?)?,
            allowed_origin: locality_from_u8(deserializer.deserialize()?)?,
        })
    }
}

pub(crate) struct UndeclareSubscriber {
    pub(crate) id: u32,
}

impl UndeclareSubscriber {
    pub(crate) fn from_wire(deserializer: &mut ZDeserializer) -> Result<Self, zenoh_result::Error> {
        Ok(UndeclareSubscriber {
            id: deserializer.deserialize()?,
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
    pub(crate) fn from_wire(deserializer: &mut ZDeserializer) -> Result<Self, zenoh_result::Error> {
        Ok(DeclareQueryable {
            id: deserializer.deserialize()?,
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
    pub(crate) fn from_wire(deserializer: &mut ZDeserializer) -> Result<Self, zenoh_result::Error> {
        Ok(UndeclareQueryable {
            id: deserializer.deserialize()?,
        })
    }
}

pub(crate) struct DeclareQuerier {
    pub(crate) id: u32,
    pub(crate) keyexpr: OwnedKeyExpr,
    pub(crate) qos: Qos,
    pub(crate) query_settings: QuerySettings,
    pub(crate) timeout_ms: u32,
}

impl DeclareQuerier {
    pub(crate) fn from_wire(deserializer: &mut ZDeserializer) -> Result<Self, zenoh_result::Error> {
        Ok(DeclareQuerier {
            id: deserializer.deserialize()?,
            keyexpr: OwnedKeyExpr::try_from(deserializer.deserialize::<String>()?)?,
            qos: deserializer.deserialize()?,
            query_settings: deserializer.deserialize()?,
            timeout_ms: deserializer.deserialize()?,
        })
    }
}

pub(crate) struct UndeclareQuerier {
    pub(crate) id: u32,
}

impl UndeclareQuerier {
    pub(crate) fn from_wire(deserializer: &mut ZDeserializer) -> Result<Self, zenoh_result::Error> {
        Ok(UndeclareQuerier {
            id: deserializer.deserialize()?,
        })
    }
}

pub(crate) struct GetSessionInfo {}

impl GetSessionInfo {
    pub(crate) fn from_wire(
        _deserializer: &mut ZDeserializer,
    ) -> Result<Self, zenoh_result::Error> {
        Ok(GetSessionInfo {})
    }
}

pub(crate) struct ResponseSessionInfo {
    pub(crate) zid: ZenohId,
    pub(crate) z_routers: Vec<ZenohId>,
    pub(crate) z_peers: Vec<ZenohId>,
}

impl ResponseSessionInfo {
    pub(crate) fn to_wire(&self, serializer: &mut ZSerializer) {
        serializer.serialize(self.zid.to_le_bytes());
        serializer.serialize_iter(self.z_routers.iter().map(|z| z.to_le_bytes()));
        serializer.serialize_iter(self.z_peers.iter().map(|z| z.to_le_bytes()));
    }
}

pub(crate) struct GetTimestamp {}

impl GetTimestamp {
    pub(crate) fn from_wire(
        _deserializer: &mut ZDeserializer,
    ) -> Result<Self, zenoh_result::Error> {
        Ok(GetTimestamp {})
    }
}

pub(crate) struct ResponseTimestamp {
    pub(crate) timestamp: Timestamp,
}

impl ResponseTimestamp {
    pub(crate) fn to_wire(&self, serializer: &mut ZSerializer) {
        serializer.serialize(timestamp_to_ntp_id(&self.timestamp));
    }
}

pub(crate) struct Put {
    pub(crate) keyexpr: OwnedKeyExpr,
    pub(crate) payload: Vec<u8>,
    pub(crate) encoding: Encoding,
    pub(crate) attachment: Option<Vec<u8>>,
    pub(crate) timestamp: Option<Timestamp>,
    pub(crate) qos: Qos,
}

impl Put {
    pub(crate) fn from_wire(deserializer: &mut ZDeserializer) -> Result<Self, zenoh_result::Error> {
        Ok(Put {
            keyexpr: OwnedKeyExpr::try_from(deserializer.deserialize::<String>()?)?,
            payload: deserializer.deserialize()?,
            encoding: encoding_from_id_schema(deserializer.deserialize()?),
            attachment: deserialize_option(deserializer)?,
            timestamp: opt_timestamp_from_ntp_id(deserialize_option(deserializer)?)?,
            qos: deserializer.deserialize()?,
        })
    }
}

pub(crate) struct Delete {
    pub(crate) keyexpr: OwnedKeyExpr,
    pub(crate) attachment: Option<Vec<u8>>,
    pub(crate) timestamp: Option<Timestamp>,
    pub(crate) qos: Qos,
}

impl Delete {
    pub(crate) fn from_wire(deserializer: &mut ZDeserializer) -> Result<Self, zenoh_result::Error> {
        Ok(Delete {
            keyexpr: OwnedKeyExpr::try_from(deserializer.deserialize::<String>()?)?,
            attachment: deserialize_option(deserializer)?,
            timestamp: opt_timestamp_from_ntp_id(deserialize_option(deserializer)?)?,
            qos: deserializer.deserialize()?,
        })
    }
}

pub(crate) struct PublisherPut {
    pub(crate) publisher_id: u32,
    pub(crate) payload: Vec<u8>,
    pub(crate) encoding: Option<Encoding>,
    pub(crate) attachment: Option<Vec<u8>>,
    pub(crate) timestamp: Option<Timestamp>,
}

impl PublisherPut {
    pub(crate) fn from_wire(deserializer: &mut ZDeserializer) -> Result<Self, zenoh_result::Error> {
        Ok(PublisherPut {
            publisher_id: deserializer.deserialize()?,
            payload: deserializer.deserialize()?,
            encoding: opt_encoding_from_id_schema(deserialize_option(deserializer)?),
            attachment: deserialize_option(deserializer)?,
            timestamp: opt_timestamp_from_ntp_id(deserialize_option(deserializer)?)?,
        })
    }
}

pub(crate) struct PublisherDelete {
    pub(crate) publisher_id: u32,
    pub(crate) attachment: Option<Vec<u8>>,
    pub(crate) timestamp: Option<Timestamp>,
}

impl PublisherDelete {
    pub(crate) fn from_wire(deserializer: &mut ZDeserializer) -> Result<Self, zenoh_result::Error> {
        Ok(PublisherDelete {
            publisher_id: deserializer.deserialize()?,
            attachment: deserialize_option(deserializer)?,
            timestamp: opt_timestamp_from_ntp_id(deserialize_option(deserializer)?)?,
        })
    }
}

pub(crate) struct Get {
    pub(crate) id: u32,
    pub(crate) keyexpr: OwnedKeyExpr,
    pub(crate) parameters: String,
    pub(crate) payload: Option<Vec<u8>>,
    pub(crate) encoding: Option<Encoding>,
    pub(crate) attachment: Option<Vec<u8>>,
    pub(crate) qos: Qos,
    pub(crate) query_settings: QuerySettings,
    pub(crate) timeout_ms: u32,
}

impl Get {
    pub(crate) fn from_wire(deserializer: &mut ZDeserializer) -> Result<Self, zenoh_result::Error> {
        Ok(Get {
            id: deserializer.deserialize()?,
            keyexpr: OwnedKeyExpr::try_from(deserializer.deserialize::<String>()?)?,
            parameters: deserializer.deserialize()?,
            payload: deserialize_option(deserializer)?,
            encoding: opt_encoding_from_id_schema(deserialize_option(deserializer)?),
            attachment: deserialize_option(deserializer)?,
            qos: deserializer.deserialize()?,
            query_settings: deserializer.deserialize()?,
            timeout_ms: deserializer.deserialize()?,
        })
    }
}

pub(crate) struct QuerierGet {
    pub(crate) id: u32,
    pub(crate) querier_id: u32,
    pub(crate) parameters: String,
    pub(crate) payload: Option<Vec<u8>>,
    pub(crate) encoding: Option<Encoding>,
    pub(crate) attachment: Option<Vec<u8>>,
}

impl QuerierGet {
    pub(crate) fn from_wire(deserializer: &mut ZDeserializer) -> Result<Self, zenoh_result::Error> {
        Ok(QuerierGet {
            id: deserializer.deserialize()?,
            querier_id: deserializer.deserialize()?,
            parameters: deserializer.deserialize()?,
            payload: deserialize_option(deserializer)?,
            encoding: opt_encoding_from_id_schema(deserialize_option(deserializer)?),
            attachment: deserialize_option(deserializer)?,
        })
    }
}

fn serialize_sample(serializer: &mut ZSerializer, sample: &zenoh::sample::Sample) {
    serializer.serialize(sample.key_expr().as_str());
    serializer.serialize(sample.payload().to_bytes());
    serializer.serialize(sample_kind_to_u8(sample.kind()));
    serializer.serialize(encoding_to_id_schema(sample.encoding()));
    serialize_option(serializer, &sample.attachment().map(|a| a.to_bytes()));
    serialize_option(serializer, &sample.timestamp().map(timestamp_to_ntp_id));
    let qos = Qos::new(
        sample.priority(),
        sample.congestion_control(),
        sample.express(),
        sample.reliability(),
        Locality::default(),
    );
    serializer.serialize(qos);
}

pub(crate) struct Sample {
    pub(crate) subscriber_id: u32,
    pub(crate) sample: zenoh::sample::Sample,
}

impl Sample {
    pub(crate) fn to_wire(&self, serializer: &mut ZSerializer) {
        serializer.serialize(self.subscriber_id);
        serialize_sample(serializer, &self.sample);
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
    serialize_option(serializer, &query.encoding().map(encoding_to_id_schema));
    serialize_option(serializer, &query.attachment().map(|a| a.to_bytes()));
    serializer.serialize(reply_keyexpr_to_u8(
        query
            .accepts_replies()
            .unwrap_or(ReplyKeyExpr::MatchingQuery),
    ));
}

impl Query {
    pub(crate) fn to_wire(&self, serializer: &mut ZSerializer) {
        serializer.serialize(self.queryable_id);
        serializer.serialize(self.query_id);
        serialize_query(serializer, &self.query);
    }
}

pub(crate) struct Reply {
    pub(crate) query_id: u32,
    pub(crate) reply: zenoh::query::Reply,
}

fn serialize_reply(serializer: &mut ZSerializer, reply: &zenoh::query::Reply) {
    match reply.result() {
        Ok(s) => {
            serializer.serialize(true);
            serialize_sample(serializer, s);
        }
        Err(e) => {
            serializer.serialize(false);
            serializer.serialize(e.payload().to_bytes());
            serializer.serialize(encoding_to_id_schema(e.encoding()));
        }
    }
}

impl Reply {
    pub(crate) fn to_wire(&self, serializer: &mut ZSerializer) {
        serializer.serialize(self.query_id);
        serialize_reply(serializer, &self.reply);
    }
}

pub(crate) struct ReplyOk {
    pub(crate) query_id: u32,
    pub(crate) keyexpr: OwnedKeyExpr,
    pub(crate) payload: Vec<u8>,
    pub(crate) encoding: Encoding,
    pub(crate) attachment: Option<Vec<u8>>,
    pub(crate) timestamp: Option<Timestamp>,
    pub(crate) qos: Qos,
}

impl ReplyOk {
    pub(crate) fn from_wire(deserializer: &mut ZDeserializer) -> Result<Self, zenoh_result::Error> {
        Ok(ReplyOk {
            query_id: deserializer.deserialize()?,
            keyexpr: OwnedKeyExpr::try_from(deserializer.deserialize::<String>()?)?,
            payload: deserializer.deserialize()?,
            encoding: encoding_from_id_schema(deserializer.deserialize()?),
            attachment: deserialize_option(deserializer)?,
            timestamp: opt_timestamp_from_ntp_id(deserialize_option(deserializer)?)?,
            qos: deserializer.deserialize()?,
        })
    }
}

pub(crate) struct ReplyDel {
    pub(crate) query_id: u32,
    pub(crate) keyexpr: OwnedKeyExpr,
    pub(crate) attachment: Option<Vec<u8>>,
    pub(crate) timestamp: Option<Timestamp>,
    pub(crate) qos: Qos,
}

impl ReplyDel {
    pub(crate) fn from_wire(deserializer: &mut ZDeserializer) -> Result<Self, zenoh_result::Error> {
        Ok(ReplyDel {
            query_id: deserializer.deserialize()?,
            keyexpr: OwnedKeyExpr::try_from(deserializer.deserialize::<String>()?)?,
            attachment: deserialize_option(deserializer)?,
            timestamp: opt_timestamp_from_ntp_id(deserialize_option(deserializer)?)?,
            qos: deserializer.deserialize()?,
        })
    }
}

pub(crate) struct ReplyErr {
    pub(crate) query_id: u32,
    pub(crate) payload: Vec<u8>,
    pub(crate) encoding: Encoding,
}

impl ReplyErr {
    pub(crate) fn from_wire(deserializer: &mut ZDeserializer) -> Result<Self, zenoh_result::Error> {
        Ok(ReplyErr {
            query_id: deserializer.deserialize()?,
            payload: deserializer.deserialize()?,
            encoding: encoding_from_id_schema(deserializer.deserialize()?),
        })
    }
}

pub(crate) struct QueryResponseFinal {
    pub(crate) query_id: u32,
}

impl QueryResponseFinal {
    pub(crate) fn to_wire(&self, serializer: &mut ZSerializer) {
        serializer.serialize(self.query_id);
    }

    pub(crate) fn from_wire(
        deserializer: &mut ZDeserializer,
    ) -> Result<QueryResponseFinal, zenoh_result::Error> {
        Ok(QueryResponseFinal {
            query_id: deserializer.deserialize()?,
        })
    }
}

pub(crate) struct DeclareLivelinessToken {
    pub(crate) id: u32,
    pub(crate) keyexpr: OwnedKeyExpr,
}

impl DeclareLivelinessToken {
    pub(crate) fn from_wire(
        deserializer: &mut ZDeserializer,
    ) -> Result<DeclareLivelinessToken, zenoh_result::Error> {
        Ok(DeclareLivelinessToken {
            id: deserializer.deserialize()?,
            keyexpr: OwnedKeyExpr::try_from(deserializer.deserialize::<String>()?)?,
        })
    }
}

pub(crate) struct UndeclareLivelinessToken {
    pub(crate) id: u32,
}

impl UndeclareLivelinessToken {
    pub(crate) fn from_wire(deserializer: &mut ZDeserializer) -> Result<Self, zenoh_result::Error> {
        Ok(UndeclareLivelinessToken {
            id: deserializer.deserialize()?,
        })
    }
}

pub(crate) struct DeclareLivelinessSubscriber {
    pub(crate) id: u32,
    pub(crate) keyexpr: OwnedKeyExpr,
    pub(crate) history: bool,
}

impl DeclareLivelinessSubscriber {
    pub(crate) fn from_wire(
        deserializer: &mut ZDeserializer,
    ) -> Result<DeclareLivelinessSubscriber, zenoh_result::Error> {
        Ok(DeclareLivelinessSubscriber {
            id: deserializer.deserialize()?,
            keyexpr: OwnedKeyExpr::try_from(deserializer.deserialize::<String>()?)?,
            history: deserializer.deserialize()?,
        })
    }
}

pub(crate) struct UndeclareLivelinessSubscriber {
    pub(crate) id: u32,
}

impl UndeclareLivelinessSubscriber {
    pub(crate) fn from_wire(deserializer: &mut ZDeserializer) -> Result<Self, zenoh_result::Error> {
        Ok(UndeclareLivelinessSubscriber {
            id: deserializer.deserialize()?,
        })
    }
}

pub(crate) struct LivelinessGet {
    pub(crate) id: u32,
    pub(crate) keyexpr: OwnedKeyExpr,
    pub(crate) timeout_ms: u32,
}

impl LivelinessGet {
    pub(crate) fn from_wire(deserializer: &mut ZDeserializer) -> Result<Self, zenoh_result::Error> {
        Ok(LivelinessGet {
            id: deserializer.deserialize()?,
            keyexpr: OwnedKeyExpr::try_from(deserializer.deserialize::<String>()?)?,
            timeout_ms: deserializer.deserialize()?,
        })
    }
}

macro_rules! count {
    () => (0usize);
    ( $x:tt $($xs:tt)* ) => (1usize + count!($($xs)*));
}

macro_rules! remote_message_inner {
    ($typ:ty, $enum_name:ident, $name:ident, $access:vis, $( #[$meta:meta] )* $($val:ident,)*) => {
        #[repr($typ)]
        #[derive(Clone, Copy, Debug)]
        $access enum $enum_name {
            $($val,)*
        }

        impl From<$enum_name> for $typ {
            fn from(enm: $enum_name) -> Self {
                enm as $typ
            }
        }

        impl TryFrom<$typ> for $enum_name {
            type Error = zenoh_result::Error;
            fn try_from(x: $typ) -> Result<Self, zenoh_result::Error> {
                const VALS: [$enum_name; count!($($val)*)] =  [$($enum_name::$val,)*];
                if VALS.len() > x as usize {
                    Ok(VALS[x as usize])
                } else {
                    bail!("Unsupported {} {} value", stringify!($enum_name), x);
                }
            }
        }
        $( #[$meta] )*
        $access enum $name {
            $($val($val),)*
        }
    }
}

macro_rules! remote_message {
    (   @from_wire
        #[repr($typ:ty)]
        $( #[$meta:meta] )*
        $access:vis enum $name:ident {
            $($val:ident,)*
        },
        $enum_name:ident
    ) => {
        remote_message_inner!{$typ, $enum_name, $name, $access, $( #[$meta] )*  $($val,)* }

        #[derive(Copy, Clone, Debug)]
        $access struct Header {
            $access content_id: $enum_name,
            $access sequence_id: Option<SequenceId>,
        }

        $access enum FromWireError {
            HeaderError(zenoh_result::Error),
            BodyError((Header, zenoh_result::Error))
        }

        impl From<zenoh_result::Error> for FromWireError {
            fn from(e: zenoh_result::Error) -> Self {
                Self::HeaderError(e)
            }
        }

        impl From<ZDeserializeError> for FromWireError {
            fn from(e: ZDeserializeError) -> Self {
                Self::HeaderError(e.into())
            }
        }

        impl $name {
            $access fn from_wire(data: Vec<u8>) -> Result<(Header, $name), FromWireError> {
                let z_bytes: ZBytes = data.into();
                let mut deserializer = ZDeserializer::new(&z_bytes);
                let t: $typ = deserializer.deserialize()?;
                let requires_ack = (t & 0b10000000u8) != 0;
                let enum_t: $enum_name = (t & 0b01111111u8).try_into()?;
                match enum_t {
                    $($enum_name::$val => {
                        let sequence_id = match requires_ack {
                            true =>  Some(deserializer.deserialize::<SequenceId>()?),
                            false => None
                        };
                        let header = Header {
                            content_id: enum_t,
                            sequence_id
                        };
                        Ok((header, $name::$val($val::from_wire(&mut deserializer).map_err(|e| FromWireError::BodyError((header, e.into())))?)))
                    },)*
                }
            }
        }
    };
    (   @to_wire
        #[repr($typ:ty)]
        $( #[$meta:meta] )*
        $access:vis enum $name:ident {
            $($val:ident,)*
        },
        $enum_name:ident
    ) => {
        remote_message_inner!{$typ, $enum_name, $name, $access, $( #[$meta] )*  $($val,)* }
        impl $name {
            $access fn to_wire(&self, sequence_id: Option<SequenceId>) -> Vec<u8> {
                let mut serializer = ZSerializer::new();
                match self {
                    $($name::$val(x) => {
                        let mut t: $typ = $enum_name::$val.into();
                        match sequence_id {
                            Some(id) => {
                                t |= 0b10000000u8;
                                serializer.serialize(t);
                                serializer.serialize(id);
                            },
                            None => {
                                serializer.serialize(t);
                            }
                        }
                        x.to_wire(&mut serializer);
                        serializer.finish().to_bytes().to_vec()
                    },)*
                }
            }
        }
    };
}

remote_message! {
    @from_wire
    #[repr(u8)]
    pub(crate) enum InRemoteMessage {
        DeclarePublisher,
        UndeclarePublisher,
        DeclareSubscriber,
        UndeclareSubscriber,
        DeclareQueryable,
        UndeclareQueryable,
        DeclareQuerier,
        UndeclareQuerier,
        DeclareLivelinessToken,
        UndeclareLivelinessToken,
        DeclareLivelinessSubscriber,
        UndeclareLivelinessSubscriber,
        GetSessionInfo,
        GetTimestamp,
        Put,
        Delete,
        PublisherPut,
        PublisherDelete,
        Get,
        QuerierGet,
        LivelinessGet,
        ReplyOk,
        ReplyDel,
        ReplyErr,
        QueryResponseFinal,
        Ping,
    },
    InRemoteMessageId
}

remote_message! {
    @to_wire
    #[repr(u8)]
    pub(crate) enum OutRemoteMessage {
        PingAck,
        Ok,
        Error,
        ResponseTimestamp,
        ResponseSessionInfo,
        Sample,
        Query,
        Reply,
        QueryResponseFinal,
    },
    OutRemoteMessageId
}
