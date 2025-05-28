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
    fs::File,
    future::Future,
    io::{self, BufReader, ErrorKind},
    net::SocketAddr,
    path::Path,
    sync::{Arc, Mutex},
};

use futures::{future, pin_mut, StreamExt, TryStreamExt};
use interface::{InRemoteMessage, OutRemoteMessage, SequenceId};
use remote_state::RemoteState;
use rustls_pemfile::{certs, private_key};
use serde::Serialize;
use tokio::{
    net::{TcpListener, TcpStream},
    select,
    sync::RwLock,
    task::JoinHandle,
};
use tokio_rustls::{
    rustls::{
        self,
        pki_types::{CertificateDer, PrivateKeyDer},
    },
    server::TlsStream,
    TlsAcceptor,
};
use tokio_tungstenite::tungstenite::protocol::Message;
use uuid::Uuid;
use zenoh::{
    bytes::{Encoding, ZBytes},
    internal::{
        plugins::{RunningPluginTrait, ZenohPlugin},
        runtime::Runtime,
    },
    key_expr::{
        format::{kedefine, keformat},
        keyexpr, OwnedKeyExpr,
    },
    query::Query,
};
use zenoh_plugin_trait::{plugin_long_version, plugin_version, Plugin, PluginControl};
use zenoh_result::{bail, zerror, ZResult};

mod config;
pub use config::Config;

mod interface;

mod remote_state;

kedefine!(
    // Admin space key expressions of plugin's version
    pub ke_admin_version: "${plugin_status_key:**}/__version__",

    // Admin prefix of this bridge
    pub ke_admin_prefix: "@/${zenoh_id:*}/remote-plugin/",
);

const WORKER_THREAD_NUM: usize = 2;
const MAX_BLOCK_THREAD_NUM: usize = 50;
const GIT_VERSION: &str = git_version::git_version!(prefix = "v", cargo_prefix = "v");

lazy_static::lazy_static! {
    static ref LONG_VERSION: String = format!("{} built with {}", GIT_VERSION, env!("RUSTC_VERSION"));
    // The global runtime is used in the dynamic plugins, which we can't get the current runtime
    static ref TOKIO_RUNTIME: tokio::runtime::Runtime = tokio::runtime::Builder::new_multi_thread()
        .worker_threads(WORKER_THREAD_NUM)
        .max_blocking_threads(MAX_BLOCK_THREAD_NUM)
        .enable_all()
        .build()
        .expect("Unable to create runtime");
    static ref KE_ANY_N_SEGMENT: &'static keyexpr =  unsafe { keyexpr::from_str_unchecked("**") };
}

// An reference used in admin space to point to a struct (DdsEntity or Route) stored in another map
#[derive(Debug)]
enum AdminRef {
    Config,
    Version,
}

#[inline(always)]
pub(crate) fn spawn_runtime<F>(task: F) -> JoinHandle<F::Output>
where
    F: Future + Send + 'static,
    F::Output: Send + 'static,
{
    // Check whether able to get the current runtime
    match tokio::runtime::Handle::try_current() {
        Ok(rt) => {
            // Able to get the current runtime (standalone binary), use the current runtime
            rt.spawn(task)
        }
        Err(_) => {
            // Unable to get the current runtime (dynamic plugins), reuse the global runtime
            TOKIO_RUNTIME.spawn(task)
        }
    }
}

pub fn spawn_future(fut: impl Future<Output = ()> + 'static + std::marker::Send) -> JoinHandle<()> {
    match tokio::runtime::Handle::try_current() {
        Ok(rt) => rt.spawn(fut),
        Err(_) => TOKIO_RUNTIME.spawn(fut),
    }
}

fn load_certs(path: &Path) -> io::Result<Vec<CertificateDer<'static>>> {
    certs(&mut BufReader::new(File::open(path)?)).collect()
}

fn load_key(path: &Path) -> io::Result<PrivateKeyDer<'static>> {
    private_key(&mut BufReader::new(File::open(path)?))
        .unwrap()
        .ok_or(io::Error::new(
            ErrorKind::Other,
            "No private key found".to_string(),
        ))
}

pub struct RemoteApiPlugin;

#[cfg(feature = "dynamic_plugin")]
zenoh_plugin_trait::declare_plugin!(RemoteApiPlugin);
impl ZenohPlugin for RemoteApiPlugin {}
impl Plugin for RemoteApiPlugin {
    type StartArgs = Runtime;
    type Instance = zenoh::internal::plugins::RunningPlugin;
    const DEFAULT_NAME: &'static str = "remote_api";
    const PLUGIN_VERSION: &'static str = plugin_version!();
    const PLUGIN_LONG_VERSION: &'static str = plugin_long_version!();

    fn start(
        name: &str,
        runtime: &Self::StartArgs,
    ) -> ZResult<zenoh::internal::plugins::RunningPlugin> {
        // Try to initiate login.
        // Required in case of dynamic lib, otherwise no logs.
        // But cannot be done twice in case of static link.
        zenoh_util::try_init_log_from_env();
        tracing::info!("Starting {name}");

        let runtime_conf = runtime.config().lock();

        let plugin_conf = runtime_conf
            .plugin(name)
            .ok_or_else(|| zerror!("Plugin `{}`: missing config", name))?;

        let conf: Config = serde_json::from_value(plugin_conf.clone())
            .map_err(|e| zerror!("Plugin `{}` configuration error: {}", name, e))?;

        let wss_config: Option<(Vec<CertificateDer<'_>>, PrivateKeyDer<'_>)> =
            match conf.secure_websocket.clone() {
                Some(wss_config) => {
                    tracing::info!("Loading certs from : {} ...", wss_config.certificate_path);
                    let certs = load_certs(Path::new(&wss_config.certificate_path))
                        .map_err(|err| zerror!("Could not Load WSS Cert `{}`", err))?;
                    tracing::info!(
                        "Loading Private Key from : {} ...",
                        wss_config.private_key_path
                    );
                    let key = load_key(Path::new(&wss_config.private_key_path))
                        .map_err(|err| zerror!("Could not Load WSS Private Key `{}`", err))?;
                    Some((certs, key))
                }
                None => None,
            };

        let weak_runtime = Runtime::downgrade(runtime);
        if let Some(runtime) = weak_runtime.upgrade() {
            spawn_runtime(run(runtime, conf, wss_config));

            Ok(Box::new(RunningPlugin(RemoteAPIPlugin)))
        } else {
            bail!("Cannot Get Zenoh Instance of Runtime !")
        }
    }
}

pub async fn run(
    runtime: Runtime,
    config: Config,
    opt_certs: Option<(Vec<CertificateDer<'static>>, PrivateKeyDer<'static>)>,
) {
    let state_map = Arc::new(RwLock::new(HashMap::new()));

    // Return WebServer And State
    let remote_api_runtime = RemoteAPIRuntime {
        config: Arc::new(config),
        wss_certs: opt_certs,
        zenoh_runtime: runtime,
        state_map,
    };

    remote_api_runtime.run().await;
}

struct RemoteAPIRuntime {
    config: Arc<Config>,
    wss_certs: Option<(Vec<CertificateDer<'static>>, PrivateKeyDer<'static>)>,
    zenoh_runtime: Runtime,
    state_map: StateMap,
}

impl RemoteAPIRuntime {
    async fn run(self) {
        let run_websocket_server = run_websocket_server(
            &self.config.websocket_port,
            self.zenoh_runtime.clone(),
            self.state_map.clone(),
            self.wss_certs,
        );

        let config = (*self.config).clone();

        let run_admin_space_queryable =
            run_admin_space_queryable(self.zenoh_runtime.clone(), self.state_map.clone(), config);

        select!(
            _ = run_websocket_server => {},
            _ = run_admin_space_queryable => {},
        );
    }
}

#[derive(Debug, Serialize, Clone)]
pub(crate) struct AdminSpaceClient {
    uuid: String,
    remote_address: SocketAddr,
    publishers: HashMap<u32, String>,
    subscribers: HashMap<u32, String>,
    queryables: HashMap<u32, String>,
    queriers: HashMap<u32, String>,
    liveliness_tokens: HashMap<u32, String>,
}

impl AdminSpaceClient {
    pub(crate) fn new(uuid: String, remote_address: SocketAddr) -> Self {
        AdminSpaceClient {
            uuid,
            remote_address,
            publishers: HashMap::new(),
            subscribers: HashMap::new(),
            queryables: HashMap::new(),
            queriers: HashMap::new(),
            liveliness_tokens: HashMap::new(),
        }
    }

    pub(crate) fn register_publisher(&mut self, id: u32, key_expr: &str) {
        self.publishers.insert(id, key_expr.to_string());
    }

    pub(crate) fn register_subscriber(&mut self, id: u32, key_expr: &str) {
        self.subscribers.insert(id, key_expr.to_string());
    }

    pub(crate) fn register_queryable(&mut self, id: u32, key_expr: &str) {
        self.queryables.insert(id, key_expr.to_string());
    }

    pub(crate) fn register_querier(&mut self, id: u32, key_expr: &str) {
        self.queriers.insert(id, key_expr.to_string());
    }

    pub(crate) fn unregister_publisher(&mut self, id: u32) {
        self.publishers.remove(&id);
    }

    pub(crate) fn unregister_subscriber(&mut self, id: u32) {
        self.subscribers.remove(&id);
    }

    pub(crate) fn unregister_queryable(&mut self, id: u32) {
        self.queryables.remove(&id);
    }

    pub(crate) fn unregister_querier(&mut self, id: u32) {
        self.queriers.remove(&id);
    }

    pub(crate) fn id(&self) -> &str {
        &self.uuid
    }
}

async fn run_admin_space_queryable(zenoh_runtime: Runtime, state_map: StateMap, config: Config) {
    let session = match zenoh::session::init(zenoh_runtime.clone()).await {
        Ok(session) => session,
        Err(err) => {
            tracing::error!("Unable to get Zenoh session from Runtime {err}");
            return;
        }
    };

    let admin_prefix = keformat!(
        ke_admin_prefix::formatter(),
        zenoh_id = session.zid().into_keyexpr()
    )
    .unwrap();

    let mut admin_space: HashMap<OwnedKeyExpr, AdminRef> = HashMap::new();

    admin_space.insert(
        &admin_prefix / unsafe { keyexpr::from_str_unchecked("config") },
        AdminRef::Config,
    );
    admin_space.insert(
        &admin_prefix / unsafe { keyexpr::from_str_unchecked("version") },
        AdminRef::Version,
    );

    let admin_keyexpr_expr = (&admin_prefix) / *KE_ANY_N_SEGMENT;

    let admin_queryable = session
        .declare_queryable(admin_keyexpr_expr)
        .await
        .expect("Failed fo create AdminSpace Queryable");

    loop {
        match admin_queryable.recv_async().await {
            Ok(query) => {
                let query_ke: OwnedKeyExpr = query.key_expr().to_owned().into();

                if query_ke.is_wild() {
                    if query_ke.contains("clients") {
                        let read_guard = state_map.read().await;
                        let admin_space_clients = read_guard
                            .values()
                            .map(|v| v.lock().unwrap().clone())
                            .collect::<Vec<_>>();
                        drop(read_guard);
                        send_reply(admin_space_clients, query, query_ke).await;
                    } else {
                        for (ke, admin_ref) in admin_space.iter() {
                            if query_ke.intersects(ke) {
                                send_admin_reply(&query, ke, admin_ref, &config).await;
                            }
                        }
                    }
                } else {
                    let own_ke: OwnedKeyExpr = query_ke.to_owned();
                    if own_ke.contains("config") {
                        send_admin_reply(&query, &own_ke, &AdminRef::Config, &config).await;
                    }
                    if own_ke.contains("client") {
                        let mut opt_id = None;
                        let split = own_ke.split('/');
                        let mut next_is_id = false;
                        for elem in split {
                            if next_is_id {
                                opt_id = Some(elem);
                            } else if elem.contains("client") {
                                next_is_id = true;
                            }
                        }
                        if let Some(id) = opt_id {
                            let read_guard = state_map.read().await;
                            if let Some(state) = read_guard.get(id) {
                                let state = state.lock().unwrap().clone();
                                drop(read_guard);
                                send_reply(state, query, own_ke).await;
                            }
                        }
                    }
                }
            }
            Err(_) => {
                tracing::warn!("Admin Space queryable was closed!");
            }
        }
    }
}

async fn send_reply<T>(reply: T, query: Query, query_ke: OwnedKeyExpr)
where
    T: Sized + Serialize,
{
    match serde_json::to_string_pretty(&reply) {
        Ok(json_string) => {
            if let Err(err) = query
                .reply(query_ke, json_string)
                .encoding(Encoding::APPLICATION_JSON)
                .await
            {
                tracing::error!("AdminSpace: Reply to Query failed, {}", err);
            };
        }
        Err(_) => {
            tracing::error!("AdminSpace: Could not seralize client data");
        }
    };
}

async fn send_admin_reply(
    query: &Query,
    key_expr: &keyexpr,
    admin_ref: &AdminRef,
    config: &Config,
) {
    let z_bytes: ZBytes = match admin_ref {
        AdminRef::Version => match serde_json::to_value(RemoteApiPlugin::PLUGIN_LONG_VERSION) {
            Ok(v) => match serde_json::to_vec(&v) {
                Ok(value) => ZBytes::from(value),
                Err(e) => {
                    tracing::warn!("Error transforming JSON to ZBytes: {}", e);
                    return;
                }
            },
            Err(e) => {
                tracing::error!("INTERNAL ERROR serializing config as JSON: {}", e);
                return;
            }
        },
        AdminRef::Config => match serde_json::to_value(config) {
            Ok(v) => match serde_json::to_vec(&v) {
                Ok(value) => ZBytes::from(value),
                Err(e) => {
                    tracing::warn!("Error transforming JSON to ZBytes: {}", e);
                    return;
                }
            },
            Err(e) => {
                tracing::error!("INTERNAL ERROR serializing config as JSON: {}", e);
                return;
            }
        },
    };
    if let Err(e) = query
        .reply(key_expr.to_owned(), z_bytes)
        .encoding(zenoh::bytes::Encoding::APPLICATION_JSON)
        .await
    {
        tracing::warn!("Error replying to admin query {:?}: {}", query, e);
    }
}

struct RemoteAPIPlugin;

#[allow(dead_code)]
struct RunningPlugin(RemoteAPIPlugin);

impl PluginControl for RunningPlugin {}

impl RunningPluginTrait for RunningPlugin {
    fn config_checker(
        &self,
        _path: &str,
        _current: &serde_json::Map<String, serde_json::Value>,
        _new: &serde_json::Map<String, serde_json::Value>,
    ) -> ZResult<Option<serde_json::Map<String, serde_json::Value>>> {
        bail!("Runtime configuration change not supported");
    }
}

type StateMap = Arc<RwLock<HashMap<String, Arc<Mutex<AdminSpaceClient>>>>>;

pub trait Streamable:
    tokio::io::AsyncRead + tokio::io::AsyncWrite + std::marker::Send + Unpin
{
}
impl Streamable for TcpStream {}
impl Streamable for TlsStream<TcpStream> {}

// Listen on the Zenoh Session
async fn run_websocket_server(
    ws_port: &String,
    zenoh_runtime: Runtime,
    state_map: StateMap,
    opt_certs: Option<(Vec<CertificateDer<'static>>, PrivateKeyDer<'static>)>,
) {
    let mut opt_tls_acceptor: Option<TlsAcceptor> = None;

    if let Some((certs, key)) = opt_certs {
        let config = rustls::ServerConfig::builder()
            .with_no_client_auth()
            .with_single_cert(certs, key)
            .map_err(|err| io::Error::new(io::ErrorKind::InvalidInput, err))
            .expect("Could not build TLS Configuration from Certficiate/Key Combo :");
        opt_tls_acceptor = Some(TlsAcceptor::from(Arc::new(config)));
    }

    let server: TcpListener = match TcpListener::bind(ws_port).await {
        Ok(server) => server,
        Err(err) => {
            tracing::error!("Unable to start TcpListener {err}");
            return;
        }
    };

    while let Ok((tcp_stream, sock_addr)) = server.accept().await {
        let zenoh_runtime = zenoh_runtime.clone();
        let opt_tls_acceptor = opt_tls_acceptor.clone();
        let state_map2 = state_map.clone();
        let new_websocket = async move {
            let sock_adress = Arc::new(sock_addr);
            let (ws_ch_tx, ws_ch_rx) = flume::unbounded::<(OutRemoteMessage, Option<SequenceId>)>();

            let session = match zenoh::session::init(zenoh_runtime.clone()).await {
                Ok(session) => session,
                Err(err) => {
                    tracing::error!("Unable to get Zenoh session from Runtime {err}");
                    return;
                }
            };
            let id = Uuid::new_v4();
            tracing::debug!("Client {sock_addr:?} -> {id}");

            let streamable: Box<dyn Streamable> = match &opt_tls_acceptor {
                Some(acceptor) => match acceptor.accept(tcp_stream).await {
                    Ok(tls_stream) => Box::new(tls_stream),
                    Err(err) => {
                        tracing::error!("Could not secure TcpStream -> TlsStream {:?}", err);
                        return;
                    }
                },
                None => Box::new(tcp_stream),
            };

            let ws_stream = match tokio_tungstenite::accept_async(streamable).await {
                Ok(ws_stream) => ws_stream,
                Err(e) => {
                    tracing::error!("Error during the websocket handshake occurred: {}", e);
                    return;
                }
            };

            let (ws_tx, ws_rx) = ws_stream.split();

            let ch_rx_stream = ws_ch_rx
                .into_stream()
                .map(|(out_msg, sequence_id)| Ok(Message::Binary(out_msg.to_wire(sequence_id))))
                .forward(ws_tx);

            // send confirmation that session was successfully opened
            let admin_client =
                Arc::new(Mutex::new(AdminSpaceClient::new(id.to_string(), sock_addr)));
            state_map2
                .write()
                .await
                .insert(id.to_string(), admin_client.clone());

            let mut remote_state = RemoteState::new(ws_ch_tx.clone(), admin_client, session);

            //  Incoming message from Websocket
            let incoming_ws = tokio::task::spawn(async move {
                let mut non_close_messages = ws_rx.try_filter(|msg| future::ready(!msg.is_close()));

                while let Ok(Some(msg)) = non_close_messages.try_next().await {
                    if let Some(response) = handle_message(msg, &mut remote_state).await {
                        if let Err(err) = ws_ch_tx.send(response) {
                            tracing::error!("WS Send Error: {err:?}");
                        };
                    };
                }
                remote_state.clear().await;
            });

            pin_mut!(ch_rx_stream, incoming_ws);
            future::select(ch_rx_stream, incoming_ws).await;

            // cleanup state
            state_map2.write().await.remove(&id.to_string());

            tracing::info!("Client Disconnected {}", sock_adress.as_ref());
        };

        spawn_future(new_websocket);
    }
}

async fn handle_message(
    msg: Message,
    state: &mut RemoteState,
) -> Option<(OutRemoteMessage, Option<SequenceId>)> {
    match msg {
        Message::Binary(val) => match InRemoteMessage::from_wire(val) {
            Ok((header, msg)) => {
                match state.handle_message(msg).await {
                    Ok(Some(msg)) => Some((msg, header.sequence_id)),
                    Ok(None) => header.sequence_id.map(|_| {
                        (
                            OutRemoteMessage::Ok(interface::Ok {
                                content_id: header.content_id,
                            }),
                            header.sequence_id,
                        )
                    }),
                    Err(error) => {
                        tracing::error!(
                            "RemoteAPI: Failed to execute request {:?}: {}",
                            header.content_id,
                            error
                        );
                        header.sequence_id.map(|_| {
                            // send error response if ack was requested
                            (
                                OutRemoteMessage::Error(interface::Error {
                                    error: error.to_string(),
                                }),
                                header.sequence_id,
                            )
                        })
                    }
                }
            }
            Err(err) => match err {
                interface::FromWireError::HeaderError(error) => {
                    tracing::error!("RemoteAPI: Failed to parse message header: {}", error);
                    None
                }
                interface::FromWireError::BodyError((header, error)) => {
                    tracing::error!(
                        "RemoteAPI: Failed to parse message body for {:?}: {}",
                        header,
                        error
                    );
                    header.sequence_id.map(|_| {
                        // send error response if ack was requested
                        (
                            OutRemoteMessage::Error(interface::Error {
                                error: error.to_string(),
                            }),
                            header.sequence_id,
                        )
                    })
                }
            },
        },
        _ => {
            tracing::error!("RemoteAPI: message format is not `Binary`");
            None
        }
    }
}
