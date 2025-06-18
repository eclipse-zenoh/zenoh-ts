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
use std::str::FromStr;

use clap::Parser;
use zenoh::{
    config::Config,
    internal::{plugins::PluginsManager, runtime::RuntimeBuilder},
    session::ZenohId,
};
use zenoh_plugin_remote_api::RemoteApiPlugin;
use zenoh_plugin_trait::Plugin;

#[derive(Parser, Debug)]
#[command(name = "zenoh bridge for Remote API")]
#[command(version = RemoteApiPlugin::PLUGIN_VERSION)]
#[command(long_version = RemoteApiPlugin::PLUGIN_LONG_VERSION)]
struct Args {
    /// The identifier (as an hexadecimal string, with odd number of chars - e.g.: 0A0B23...)
    /// that zenohd must use. WARNING: this identifier must be unique in the system and must be
    /// 16 bytes maximum (32 chars)! If not set, a random UUIDv4 will be used.
    #[arg(short, long, value_name = "HEX_STRING")]
    id: Option<String>,

    /// The zenoh session mode
    #[arg(short, long, value_enum, default_value = "peer")]
    mode: SessionMode,

    /// The configuration file. Currently, this file must be a valid JSON5 file.
    #[arg(short, long, value_name = "FILE")]
    config: Option<String>,

    /// A locator on which this router will listen for incoming sessions.
    /// Repeat this option to open several listeners.
    #[arg(short, long, value_name = "ENDPOINT")]
    listen: Vec<String>,

    /// A peer locator this router will try to connect to.
    /// Repeat this option to connect to several peers.
    #[arg(short = 'e', long, value_name = "ENDPOINT")]
    connect: Vec<String>,

    /// By default the zenoh bridge listens and replies to UDP multicast scouting messages
    /// for being discovered by peers and routers. This option disables this feature.
    #[arg(long)]
    no_multicast_scouting: bool,

    /// Configures HTTP interface for the REST API (disabled by default, setting this option
    /// enables it). Accepted values: a port number or a string with format `<local_ip>:<port_number>`
    /// (to bind the HTTP server to a specific interface).
    #[arg(long, value_name = "PORT | IP:PORT")]
    rest_http_port: Option<String>,

    /// WebSocket port for the Remote API (default: 10000). Accepted values: a port number
    /// or a string with format `<local_ip>:<port_number>` (to bind the WebSocket server to a specific interface).
    #[arg(long, value_name = "PORT | IP:PORT")]
    ws_port: Option<String>,

    /// Path to the TLS certificate file for secure WebSocket connections.
    #[arg(long, value_name = "PATH")]
    cert: Option<String>,

    /// Path to the TLS private key file for secure WebSocket connections.
    #[arg(long, value_name = "PATH")]
    key: Option<String>,
}

#[derive(clap::ValueEnum, Clone, Debug)]
enum SessionMode {
    Peer,
    Client,
}

impl std::fmt::Display for SessionMode {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            SessionMode::Peer => write!(f, "peer"),
            SessionMode::Client => write!(f, "client"),
        }
    }
}

impl std::str::FromStr for SessionMode {
    type Err = String;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s.to_lowercase().as_str() {
            "peer" => Ok(SessionMode::Peer),
            "client" => Ok(SessionMode::Client),
            _ => Err(format!("Invalid session mode: {}", s)),
        }
    }
}

fn parse_args() -> Config {
    let args = Args::parse();

    // load config file at first
    let mut config = match &args.config {
        Some(conf_file) => Config::from_file(conf_file).unwrap(),
        None => Config::default(),
    };
    // if "remote_api" plugin conf is not present, add it (empty to use default config)
    if config.plugin("remote_api").is_none() {
        config.insert_json5("plugins/remote_api", "{}").unwrap();
    }

    // apply zenoh related arguments over config
    if let Some(id) = &args.id {
        config.set_id(Some(ZenohId::from_str(id).unwrap())).unwrap();
    }
    // Always set mode since it has a default value
    config
        .set_mode(Some(args.mode.to_string().parse().unwrap()))
        .unwrap();

    if !args.connect.is_empty() {
        config
            .connect
            .endpoints
            .set(args.connect.iter().map(|p| p.parse().unwrap()).collect())
            .unwrap();
    }
    if !args.listen.is_empty() {
        config
            .listen
            .endpoints
            .set(args.listen.iter().map(|p| p.parse().unwrap()).collect())
            .unwrap();
    }
    if args.no_multicast_scouting {
        config.scouting.multicast.set_enabled(Some(false)).unwrap();
    }
    if let Some(port) = &args.rest_http_port {
        config
            .insert_json5("plugins/rest/http_port", &format!(r#""{port}""#))
            .unwrap();
    }
    // Enable admin space
    config.adminspace.set_enabled(true).unwrap();
    // Enable loading plugins
    config.plugins_loading.set_enabled(true).unwrap();

    // apply Remote API related arguments over config
    if let Some(ws_port) = &args.ws_port {
        config
            .insert_json5(
                "plugins/remote_api/websocket_port",
                &format!(r#""{ws_port}""#),
            )
            .unwrap();
    }
    if let Some(cert_path) = &args.cert {
        if let Some(key_path) = &args.key {
            config
                .insert_json5(
                    "plugins/remote_api/secure_websocket/certificate_path",
                    &format!(r#""{cert_path}""#),
                )
                .unwrap();
            config
                .insert_json5(
                    "plugins/remote_api/secure_websocket/private_key_path",
                    &format!(r#""{key_path}""#),
                )
                .unwrap();
        }
    }

    config
}

#[tokio::main]
async fn main() {
    zenoh::init_log_from_env_or("z=info");
    tracing::info!(
        "zenoh-bridge-remote-api {}",
        RemoteApiPlugin::PLUGIN_LONG_VERSION
    );

    let config = parse_args();
    tracing::info!("Zenoh {config:?}");

    let mut plugins_mgr = PluginsManager::static_plugins_only();

    // declare Remote API plugin
    plugins_mgr.declare_static_plugin::<zenoh_plugin_remote_api::RemoteApiPlugin, &str>(
        "remote_api",
        true,
    );

    // create a zenoh Runtime.
    let mut runtime = match RuntimeBuilder::new(config)
        .plugins_manager(plugins_mgr)
        .build()
        .await
    {
        Ok(runtime) => runtime,
        Err(e) => {
            println!("{e}. Exiting...");
            std::process::exit(-1);
        }
    };
    if let Err(e) = runtime.start().await {
        println!("Failed to start Zenoh runtime: {e}. Exiting...");
        std::process::exit(-1);
    }

    futures::future::pending::<()>().await;
}
