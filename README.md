<img src="https://raw.githubusercontent.com/eclipse-zenoh/zenoh/master/zenoh-dragon.png" height="150">

> :warning: **This is a WIP Active development project**: Experiment with it, but it is **Not** production ready!

[![Discord](https://img.shields.io/badge/chat-on%20discord-blue)](https://discord.gg/2GJ958VuHs)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

# Eclipse Zenoh Typescript / Javascript API

The Eclipse Zenoh: Zero Overhead Pub/sub, Store/Query, and Compute.

Zenoh (pronounced _/zeno/_) unifies data in motion, data at rest, and computations. It carefully blends traditional pub/sub with
geo-distributed storage, queries, and computations, while retaining a level of time and space efficiency that is well beyond any
of the mainstream stacks.

Check the website [zenoh.io](http://zenoh.io) and the [roadmap](https://github.com/eclipse-zenoh/roadmap) for more detailed information.

---

## Typescript/Javascript API

This repository provides a Typescript / Javascript binding through the use of the `remote-api-plugin` in this repo.
The long-term plan is to use zenoh [Zenoh written in Rust](https://github.com/eclipse-zenoh/zenoh) to target WASM.
In its current state, it is not possible to compile Zenoh (Rust) to target WASM, and it will need to undergo a fair
amount of refactoring before that can happen.

Docs can be accessed at [Docs Link](https://eclipse-zenoh.github.io/zenoh-ts/)

---

## How to build and run it

> :warning: **WARNING** :warning: : Zenoh and its ecosystem are under active development. When you build from git, make sure you also
build from git any other Zenoh repository you plan to use (e.g. binding, plugin, backend, etc.). It may happen that some changes in git
are not compatible with the most recent packaged Zenoh release (e.g. deb, docker, pip). We put particular effort into maintaining
compatibility between the various git repositories in the Zenoh project.

### Executing the `zenohd` with `zenoh-plugin-remote-api` plugin

The `zenohd` router and its plugins should be built with the same Zenoh sources, the same version of the Rust compiler, and with the
same set of features. This requirement exists because the router and plugins share common Rust structures, and Rust doesn't guarantee
ABI compatibility of the memory representation of these structures.

Therefore one of the methods below is recommended to ensure that plugin and router are compatible.

The file `EXAMPLE_CONFIG.json5` references the `zenoh-plugin-remote-api\EXAMPLE_CONFIG.json5` with minimal necessary set of options to run the plugin. See also full set of available options, like ssl certificate settings in `zenoh-plugin-remote-api\config.json5`.

1. Install the latest release of `zenohd` and `zenoh-plugin-remote-api`

   Ubuntu:

   ```sh
   echo "deb [trusted=yes] https://download.eclipse.org/zenoh/debian-repo/ /" | sudo tee -a /etc/apt/sources.list.d/zenoh.list > /dev/null
   sudo apt update
   sudo apt install zenohd
   sudo apt install zenoh-plugin-remote-api
   ```

   Mac-OS:

   ```sh
   brew tap eclipse-zenoh/homebrew-zenoh
   brew install zenoh
   brew install zenoh-plugin-remote-api
   ```

   Run the installed zenoh router with example config

   ```sh
   zenohd --config EXAMPLE_CONFIG.json5
   ```
  
   Expected output should be something similar to:

    ```txt
   zenohd: zenohd v1.0.3 built with rustc 1.75.0 (82e1608df 2023-12-21)
   zenoh::net::runtime: Using ZID: f7bc54e0941036422ec08ebac6fbdb40
   zenoh::api::loader: Loading  plugin "remote_api"
   zenoh::api::loader: Starting  plugin "remote_api"
   zenoh::api::loader: Successfully started plugin remote_api from "/usr/lib/libzenoh_plugin_remote_api.so"
   zenoh::api::loader: Finished loading plugins
   zenoh::net::runtime::orchestrator: Zenoh can be reached at: tcp/....
   ```

2. Build both the plugin and the router from the sources:

   Build the plugin `zenoh-plugin-remote-api`

   ```sh
   cargo build 
   ```

   Build and run `zenohd` from the same sources used for the plugin. The `zenohd` dependency is specified in the `[workspace.metadata.bin]` section in `Cargo.toml`, which is processed by the third-party tool [cargo-run-bin](https://crates.io/crates/cargo-run-bin).

   The `zenohd` binary is built into the `.bin` directory local to the project. If necessary, remove the `.bin` directory with `rm -rf .bin` to rebuild it, as the `cargo-run-bin` tool does not handle this automatically.

   ```sh
   cargo install cargo-run-bin
   cargo bin zenohd --config EXAMPLE_CONFIG.json5
   ```  

   Expected output should be something similar to:

   ```txt
   zenohd: zenohd vc764bf9b built with rustc 1.75.0 (82e1608df 2023-12-21)
   zenoh::net::runtime: Using ZID: bb3fb16628f57e92f92accf2f5c81511
   zenoh::api::loader: Loading  plugin "remote_api"
   zenoh::api::loader: Starting  plugin "remote_api"
   zenoh::api::loader: Successfully started plugin remote_api from "./target/debug\\zenoh_plugin_remote_api.dll"
   zenoh::api::loader: Finished loading plugins
   zenoh::net::runtime::orchestrator: Zenoh can be reached at: tcp/...
   ```

### Building the library

1. Make sure that the following utilities are available on your platform.

   - [NPM](https://www.npmjs.com/package/npm)
   - [yarn](https://classic.yarnpkg.com/lang/en/docs/install/#debian-stable)
   - [Typescript](https://www.typescriptlang.org/download/)

2. Navigate to the directory `zenoh-ts`

3. Run the commands:

   ```sh
   yarn install 
   yarn run build
   ```

### Build and run the command line examples

This library is currently compatible with browsers, but not with NodeJS due to websocket library limitations.
To run the command line examples use the javascript runtime [deno](https://deno.com/) which is expected to be consistent with the browser.

1. Install [deno](https://deno.com/)
2. Navigate to the `zenoh-ts/examples/deno` directory
3. Install the `zenoh-ts` library by running `yarn install`
4. Run zenohd with the remote_api plugin, configured to websocket port 10000, as described above
5. Run the examples by running `yarn example <PATH TO EXAMPLE>`, i.e. `yarn example src/z_sub.ts`

To run publisher and subscriber examples:

```sh
yarn example src/z_pub.rs
```

```sh
yarn example src/z_sub.rs
```

The subscriber should start to receive messages from publisher:

```text
>> [Subscriber] Received PUT ('demo/example/zenoh-ts-pub': '[0] 122,101,110,111,104')
>> [Subscriber] Received PUT ('demo/example/zenoh-ts-pub': '[1] 122,101,110,111,104')
>> [Subscriber] Received PUT ('demo/example/zenoh-ts-pub': '[2] 122,101,110,111,104')
```

This will start an instance of Deno running the example.
The application will attempt to connect to a `websocket_port` : `10000` where the Remote API plugin is expected to be running.  

### Adding Typescript to your application

The latest version of zenoh-ts library can be installed from npm:

```sh
npm install @eclipse-zenoh/zenoh-ts
```

See also example application in the [zenoh-ts/examples/chat](zenoh-ts/examples/chat/README.md)
