<img src="https://raw.githubusercontent.com/eclipse-zenoh/zenoh/main/zenoh-dragon.png" height="150">

[![Discussion](https://img.shields.io/badge/discussion-on%20github-blue)](https://github.com/eclipse-zenoh/roadmap/discussions)
[![Discord](https://img.shields.io/badge/chat-on%20discord-blue)](https://discord.gg/2GJ958VuHs)
[![License](https://img.shields.io/badge/License-EPL%202.0-blue)](https://choosealicense.com/licenses/epl-2.0/)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

# Eclipse Zenoh

Eclipse Zenoh: Zero Overhead Pub/sub, Store/Query and Compute.

Zenoh (pronounced _/zeno/_) unifies data in motion, data at rest, and computations. It carefully blends traditional pub/sub with geo-distributed storages, queries, and computations, while retaining a level of time and space efficiency that is well beyond any of the mainstream stacks.

Check the website [zenoh.io](http://zenoh.io) and the [roadmap](https://github.com/eclipse-zenoh/roadmap) for more detailed information.

-------------------------------

# Remote API Plugin

In Zenoh, the remote API plugin is a library loaded into a Zenohd instance at startup, which allows the creation of a Session and declaration of Zenoh resources (Subscribers, Publishers, Queryables) remotely via WebSockets, for runtime environments where it is currently unsupported to run a Zenoh binary.
The Remote API was designed to support the TypeScript Zenoh bindings running in a browser.

-------------------------------

## **Examples of usage**

Prerequisites:

- You have a Zenoh router (`zenohd`) installed, and the `libzenoh_plugin_remote_api.so` library file is available in `~/.zenoh/lib` or `~/target/debug`.

### **Setup via a JSON5 configuration file**

- Create a `zenoh.json5` configuration file containing, for example:

    ```json5
    {
    mode: "router",
        plugins_loading: {
            enabled: true,
            search_dirs: ["./target/debug", "~/.zenoh/lib"],
        },
        plugins: {
            remote_api: {
                "websocket_port": "10000",
            },
        },
    }

    ```

- Run the Zenoh router with: `zenohd -c EXAMPLE_CONFIG.json5`

-------------------------------

## How to build it

> :warning: **WARNING** :warning: : Zenoh and its ecosystem are under active development. When you build from git, make sure you also build from git any other Zenoh repository you plan to use (e.g. binding, plugin, backend, etc.). It may happen that some changes in git are not compatible with the most recent packaged Zenoh release (e.g. deb, docker, pip). We put particular effort in maintaining compatibility between the various git repositories in the Zenoh project.

First, install [Cargo and Rust](https://doc.rust-lang.org/cargo/getting-started/installation.html). If you already have the Rust toolchain installed, make sure it is up-to-date with:

```bash
rustup update
```

> :warning: **WARNING** :warning: : As Rust doesn't have a stable ABI, the backend library should be
built with the exact same Rust version as `zenohd`, and using the same version (or commit number) for the `zenoh` dependency as `zenohd`.
Otherwise, incompatibilities in memory mapping of shared types between `zenohd` and the library can lead to a `"SIGSEGV"` crash.

The `zenohd` router and its plugins should be built with the same Zenoh sources,
the same version of the Rust compiler, and with the same set of features. This
requirement exists because the router and plugins share common Rust structures,
and Rust doesn't guarantee ABI compatibility of the memory representation of
these structures.

Therefore, one of the methods below is recommended to ensure that the plugin and
router are compatible.

The file `EXAMPLE_CONFIG.json5` references the
`zenoh-plugin-remote-api\EXAMPLE_CONFIG.json5` with the minimal necessary set of
options to run the plugin. See also the full set of available options, such as SSL
certificate settings in `zenoh-plugin-remote-api\config.json5`.

1. Install the latest release of `zenohd` and `zenoh-plugin-remote-api`

   Ubuntu:

   ```sh
   echo "deb [trusted=yes] https://download.eclipse.org/zenoh/debian-repo/ /" | sudo tee -a /etc/apt/sources.list.d/zenoh.list > /dev/null
   sudo apt update
   sudo apt install zenohd
   sudo apt install zenoh-plugin-remote-api
   ```

   macOS:

   ```sh
   brew tap eclipse-zenoh/homebrew-zenoh
   brew install zenoh
   brew install zenoh-plugin-remote-api
   ```

   Run the installed Zenoh router with the example config:

   ```sh
   zenohd --config EXAMPLE_CONFIG.json5
   ```

   The expected output should be something similar to:

   ```txt
   zenohd: zenohd v1.0.3 built with rustc 1.75.0 (82e1608df 2023-12-21)
   zenoh::net::runtime: Using ZID: f7bc54e0941036422ec08ebac6fbdb40
   zenoh::api::loader: Loading plugin "remote_api" zenoh::api::loader: Starting
   plugin "remote_api" zenoh::api::loader: Successfully started plugin remote_api
   from "/usr/lib/libzenoh_plugin_remote_api.so" zenoh::api::loader: Finished
   loading plugins zenoh::net::runtime::orchestrator: Zenoh can be reached at:
   tcp/....
   ```

2. Build both the plugin and the router from the sources manually:

   Build the plugin `zenoh-plugin-remote-api`:

   ```sh
   cargo build
   ```

   Build and run `zenohd` from the same sources used for the plugin. The
   `zenohd` dependency is specified in the `[workspace.metadata.bin]` section in
   `Cargo.toml`, which is processed by the third-party tool
   [cargo-run-bin](https://crates.io/crates/cargo-run-bin).

   The `zenohd` binary is built into the `.bin` directory local to the project.
   If necessary, remove the `.bin` directory with `rm -rf .bin` to rebuild it,
   as the `cargo-run-bin` tool does not handle this automatically.

   ```sh
   cargo install cargo-run-bin
   cargo bin zenohd --config EXAMPLE_CONFIG.json5
   ```

   The expected output should be something similar to:

   ```txt
   zenohd: zenohd vc764bf9b built with rustc 1.75.0 (82e1608df 2023-12-21)
   zenoh::net::runtime: Using ZID: bb3fb16628f57e92f92accf2f5c81511
   zenoh::api::loader: Loading  plugin "remote_api"
   zenoh::api::loader: Starting  plugin "remote_api"
   zenoh::api::loader: Successfully started plugin remote_api from "./target/debug\\zenoh_plugin_remote_api.dll"
   zenoh::api::loader: Finished loading plugins
   zenoh::net::runtime::orchestrator: Zenoh can be reached at: tcp/...
   ```
