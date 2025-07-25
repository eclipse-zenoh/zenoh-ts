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
use std::fmt;

use schemars::JsonSchema;
use serde::{
    de,
    de::{Unexpected, Visitor},
    Deserialize, Deserializer,
};

const DEFAULT_HTTP_INTERFACE: &str = "[::]";
const DEFAULT_WEBSOCKET_PORT: &str = "10000";

#[derive(JsonSchema, Deserialize, serde::Serialize, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct Config {
    #[serde(
        default = "default_websocket_port",
        deserialize_with = "deserialize_ws_port"
    )]
    pub websocket_port: String,

    pub secure_websocket: Option<SecureWebsocket>,

    #[serde(default, deserialize_with = "deserialize_path")]
    __path__: Option<Vec<String>>,
    __required__: Option<bool>,
    __config__: Option<String>,
}

#[derive(JsonSchema, Deserialize, serde::Serialize, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct SecureWebsocket {
    pub certificate_path: String,
    pub private_key_path: String,
}

impl From<&Config> for serde_json::Value {
    fn from(c: &Config) -> Self {
        serde_json::to_value(c).unwrap()
    }
}

fn default_websocket_port() -> String {
    format!("{}:{}", DEFAULT_HTTP_INTERFACE, DEFAULT_WEBSOCKET_PORT)
}

fn deserialize_ws_port<'de, D>(deserializer: D) -> Result<String, D::Error>
where
    D: Deserializer<'de>,
{
    deserializer.deserialize_any(WebsocketVisitor)
}

struct WebsocketVisitor;

impl Visitor<'_> for WebsocketVisitor {
    type Value = String;

    fn expecting(&self, formatter: &mut fmt::Formatter) -> fmt::Result {
        formatter.write_str(r#"either a port number as an integer or a string, either a string with format "<local_ip>:<port_number>""#)
    }

    fn visit_u64<E>(self, value: u64) -> Result<Self::Value, E>
    where
        E: de::Error,
    {
        Ok(format!("{DEFAULT_HTTP_INTERFACE}:{value}"))
    }

    fn visit_str<E>(self, value: &str) -> Result<Self::Value, E>
    where
        E: de::Error,
    {
        let parts: Vec<&str> = value.split(':').collect();
        if parts.len() > 2 {
            return Err(E::invalid_value(Unexpected::Str(value), &self));
        }
        let (interface, port) = if parts.len() == 1 {
            (DEFAULT_HTTP_INTERFACE, parts[0])
        } else {
            (parts[0], parts[1])
        };
        if port.parse::<u32>().is_err() {
            return Err(E::invalid_value(Unexpected::Str(port), &self));
        }
        Ok(format!("{interface}:{port}"))
    }
}

fn deserialize_path<'de, D>(deserializer: D) -> Result<Option<Vec<String>>, D::Error>
where
    D: Deserializer<'de>,
{
    deserializer.deserialize_option(OptPathVisitor)
}

struct OptPathVisitor;

impl<'de> serde::de::Visitor<'de> for OptPathVisitor {
    type Value = Option<Vec<String>>;

    fn expecting(&self, formatter: &mut std::fmt::Formatter) -> std::fmt::Result {
        write!(formatter, "none or a string or an array of strings")
    }

    fn visit_none<E>(self) -> Result<Self::Value, E>
    where
        E: de::Error,
    {
        Ok(None)
    }

    fn visit_some<D>(self, deserializer: D) -> Result<Self::Value, D::Error>
    where
        D: Deserializer<'de>,
    {
        deserializer.deserialize_any(PathVisitor).map(Some)
    }
}

struct PathVisitor;

impl<'de> serde::de::Visitor<'de> for PathVisitor {
    type Value = Vec<String>;

    fn expecting(&self, formatter: &mut std::fmt::Formatter) -> std::fmt::Result {
        write!(formatter, "a string or an array of strings")
    }

    fn visit_str<E>(self, v: &str) -> Result<Self::Value, E>
    where
        E: de::Error,
    {
        Ok(vec![v.into()])
    }

    fn visit_seq<A>(self, mut seq: A) -> Result<Self::Value, A::Error>
    where
        A: de::SeqAccess<'de>,
    {
        let mut v = seq.size_hint().map_or_else(Vec::new, Vec::with_capacity);

        while let Some(s) = seq.next_element()? {
            v.push(s);
        }
        Ok(v)
    }
}

#[cfg(test)]
mod tests {
    use super::{Config, DEFAULT_HTTP_INTERFACE, DEFAULT_WEBSOCKET_PORT};

    #[test]
    fn test_path_field() {
        // See: https://github.com/eclipse-zenoh/zenoh-plugin-webserver/issues/19
        let config = serde_json::from_str::<Config>(
            r#"{"__path__": "/example/path", "websocket_port": 8080}"#,
        );

        assert!(config.is_ok());
        let Config {
            websocket_port,
            __required__,
            __path__,
            ..
        } = config.unwrap();

        assert_eq!(websocket_port, format!("{DEFAULT_HTTP_INTERFACE}:8080"));
        assert_eq!(__path__, Some(vec![String::from("/example/path")]));
        assert_eq!(__required__, None);
    }

    #[test]
    fn test_required_field() {
        // See: https://github.com/eclipse-zenoh/zenoh-plugin-webserver/issues/19
        let config =
            serde_json::from_str::<Config>(r#"{"__required__": true, "websocket_port": 8080}"#);
        assert!(config.is_ok());
        let Config {
            websocket_port,
            __required__,
            __path__,
            ..
        } = config.unwrap();

        assert_eq!(websocket_port, format!("{DEFAULT_HTTP_INTERFACE}:8080"));
        assert_eq!(__path__, None);
        assert_eq!(__required__, Some(true));
    }

    #[test]
    fn test_path_field_and_required_field() {
        // See: https://github.com/eclipse-zenoh/zenoh-plugin-webserver/issues/19
        let config = serde_json::from_str::<Config>(
            r#"{"__path__": "/example/path", "__required__": true, "websocket_port": 8080}"#,
        );

        assert!(config.is_ok());
        let Config {
            websocket_port,
            __required__,
            __path__,
            ..
        } = config.unwrap();

        assert_eq!(websocket_port, format!("{DEFAULT_HTTP_INTERFACE}:8080"));
        assert_eq!(__path__, Some(vec![String::from("/example/path")]));
        assert_eq!(__required__, Some(true));
    }

    #[test]
    fn test_no_path_field_and_no_required_field() {
        // See: https://github.com/eclipse-zenoh/zenoh-plugin-webserver/issues/19
        let config = serde_json::from_str::<Config>(r#"{"websocket_port": 8080}"#);

        assert!(config.is_ok());
        let Config {
            websocket_port,
            __required__,
            __path__,
            ..
        } = config.unwrap();

        assert_eq!(websocket_port, format!("{DEFAULT_HTTP_INTERFACE}:8080"));
        assert_eq!(__path__, None);
        assert_eq!(__required__, None);
    }

    #[test]
    fn test_default_websocket_port() {
        // Test that the default websocket_port is used when not specified
        let config = serde_json::from_str::<Config>(r#"{}"#);

        assert!(config.is_ok());
        let Config {
            websocket_port,
            __required__,
            __path__,
            ..
        } = config.unwrap();

        assert_eq!(
            websocket_port,
            format!("{DEFAULT_HTTP_INTERFACE}:{DEFAULT_WEBSOCKET_PORT}")
        );
        assert_eq!(__path__, None);
        assert_eq!(__required__, None);
    }
}
