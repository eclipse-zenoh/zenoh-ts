use serde::{Deserialize, Deserializer, Serializer};
use zenoh::{
    qos::{CongestionControl, Priority, Reliability},
    query::{ConsolidationMode, QueryTarget, ReplyKeyExpr},
    sample::Locality,
};

pub fn deserialize_consolidation_mode<'de, D>(d: D) -> Result<Option<ConsolidationMode>, D::Error>
where
    D: Deserializer<'de>,
{
    match Option::<u8>::deserialize(d) {
        Ok(Some(value)) => Ok(Some(match value {
            0u8 => ConsolidationMode::Auto,
            1u8 => ConsolidationMode::None,
            2u8 => ConsolidationMode::Monotonic,
            3u8 => ConsolidationMode::Latest,
            _ => {
                return Err(serde::de::Error::custom(format!(
                    "Value not valid for ConsolidationMode Enum {:?}",
                    value
                )))
            }
        })),
        Ok(None) => Ok(None),
        Err(err) => Err(serde::de::Error::custom(format!(
            "Value not valid for ConsolidationMode Enum {:?}",
            err
        ))),
    }
}

pub fn serialize_consolidation_mode<S>(
    consolidation_mode: &Option<ConsolidationMode>,
    s: S,
) -> Result<S::Ok, S::Error>
where
    S: Serializer,
{
    match consolidation_mode {
        Some(c_mode) => s.serialize_u8(*c_mode as u8),
        None => s.serialize_none(),
    }
}

pub fn deserialize_reply_key_expr<'de, D>(d: D) -> Result<Option<ReplyKeyExpr>, D::Error>
where
    D: Deserializer<'de>,
{
    match Option::<u8>::deserialize(d) {
        Ok(Some(value)) => Ok(Some(match value {
            0u8 => ReplyKeyExpr::Any,
            1u8 => ReplyKeyExpr::MatchingQuery,
            _ => {
                return Err(serde::de::Error::custom(format!(
                    "Value not valid for ReplyKeyExpr Enum {:?}",
                    value
                )))
            }
        })),
        Ok(None) => Ok(None),
        Err(err) => Err(serde::de::Error::custom(format!(
            "Value not valid for ReplyKeyExpr Enum {:?}",
            err
        ))),
    }
}

pub fn serialize_reply_key_expr<S>(
    consolidation_mode: &Option<ReplyKeyExpr>,
    s: S,
) -> Result<S::Ok, S::Error>
where
    S: Serializer,
{
    match consolidation_mode {
        Some(c_mode) => s.serialize_u8(*c_mode as u8),
        None => s.serialize_none(),
    }
}

pub fn deserialize_congestion_control<'de, D>(d: D) -> Result<Option<CongestionControl>, D::Error>
where
    D: Deserializer<'de>,
{
    match Option::<u8>::deserialize(d) {
        Ok(Some(value)) => Ok(Some(match value {
            0u8 => CongestionControl::Drop,
            1u8 => CongestionControl::Block,
            val => {
                return Err(serde::de::Error::custom(format!(
                    "Value not valid for CongestionControl Enum {:?}",
                    val
                )))
            }
        })),
        Ok(None) => Ok(None),
        val => Err(serde::de::Error::custom(format!(
            "Value not valid for CongestionControl Enum {:?}",
            val
        ))),
    }
}

pub fn serialize_congestion_control<S>(
    congestion_control: &Option<CongestionControl>,
    s: S,
) -> Result<S::Ok, S::Error>
where
    S: Serializer,
{
    match congestion_control {
        Some(c_ctrl) => s.serialize_u8(*c_ctrl as u8),
        None => s.serialize_none(),
    }
}

pub fn deserialize_priority<'de, D>(d: D) -> Result<Option<Priority>, D::Error>
where
    D: Deserializer<'de>,
{
    match Option::<u8>::deserialize(d) {
        Ok(Some(value)) => Ok(Some(match value {
            1u8 => Priority::RealTime,
            2u8 => Priority::InteractiveHigh,
            3u8 => Priority::InteractiveLow,
            4u8 => Priority::DataHigh,
            5u8 => Priority::Data,
            6u8 => Priority::DataLow,
            7u8 => Priority::Background,
            val => {
                return Err(serde::de::Error::custom(format!(
                    "Value not valid for Priority Enum {:?}",
                    val
                )))
            }
        })),
        Ok(None) => Ok(None),
        val => Err(serde::de::Error::custom(format!(
            "Value not valid for Priority Enum {:?}",
            val
        ))),
    }
}

pub fn serialize_priority<S>(priority: &Option<Priority>, s: S) -> Result<S::Ok, S::Error>
where
    S: Serializer,
{
    match priority {
        Some(prio) => s.serialize_u8(*prio as u8),
        None => s.serialize_none(),
    }
}

pub fn deserialize_reliability<'de, D>(d: D) -> Result<Option<Reliability>, D::Error>
where
    D: Deserializer<'de>,
{
    match Option::<u8>::deserialize(d) {
        Ok(Some(value)) => Ok(Some(match value {
            0u8 => Reliability::BestEffort,
            1u8 => Reliability::Reliable,
            val => {
                return Err(serde::de::Error::custom(format!(
                    "Value not valid for Reliability Enum {:?}",
                    val
                )))
            }
        })),
        Ok(None) => Ok(None),
        val => Err(serde::de::Error::custom(format!(
            "Value not valid for Reliability Enum {:?}",
            val
        ))),
    }
}

pub fn serialize_reliability<S>(reliability: &Option<Reliability>, s: S) -> Result<S::Ok, S::Error>
where
    S: Serializer,
{
    match reliability {
        Some(rel) => s.serialize_u8(*rel as u8),
        None => s.serialize_none(),
    }
}

pub fn deserialize_locality<'de, D>(d: D) -> Result<Option<Locality>, D::Error>
where
    D: Deserializer<'de>,
{
    match Option::<u8>::deserialize(d) {
        Ok(Some(value)) => Ok(Some(match value {
            0u8 => Locality::SessionLocal,
            1u8 => Locality::Remote,
            2u8 => Locality::Any,
            val => {
                return Err(serde::de::Error::custom(format!(
                    "Value not valid for Locality Enum {:?}",
                    val
                )))
            }
        })),
        Ok(None) => Ok(None),
        val => Err(serde::de::Error::custom(format!(
            "Value not valid for Locality Enum {:?}",
            val
        ))),
    }
}

pub fn serialize_locality<S>(locality: &Option<Locality>, s: S) -> Result<S::Ok, S::Error>
where
    S: Serializer,
{
    match locality {
        Some(rel) => s.serialize_u8(*rel as u8),
        None => s.serialize_none(),
    }
}

pub fn deserialize_query_target<'de, D>(d: D) -> Result<Option<QueryTarget>, D::Error>
where
    D: Deserializer<'de>,
{
    match Option::<u8>::deserialize(d) {
        Ok(Some(value)) => Ok(Some(match value {
            0u8 => QueryTarget::BestMatching,
            1u8 => QueryTarget::All,
            2u8 => QueryTarget::AllComplete,
            val => {
                return Err(serde::de::Error::custom(format!(
                    "Value not valid for QueryTarget Enum {:?}",
                    val
                )))
            }
        })),
        Ok(None) => Ok(None),
        val => Err(serde::de::Error::custom(format!(
            "Value not valid for QueryTarget Enum {:?}",
            val
        ))),
    }
}

pub fn serialize_query_target<S>(
    query_target: &Option<QueryTarget>,
    s: S,
) -> Result<S::Ok, S::Error>
where
    S: Serializer,
{
    match query_target {
        Some(rel) => s.serialize_u8(*rel as u8),
        None => s.serialize_none(),
    }
}
