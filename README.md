<img src="https://raw.githubusercontent.com/eclipse-zenoh/zenoh/master/zenoh-dragon.png" height="150">

> :warning: **This is a WIP Active development project**: Experiment with with it, but it is **Not** production Ready!

[![Discord](https://img.shields.io/badge/chat-on%20discord-blue)](https://discord.gg/2GJ958VuHs)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

# Eclipse Zenoh Typescript / Javascript API

The Eclipse Zenoh: Zero Overhead Pub/sub, Store/Query and Compute.

Zenoh (pronounce _/zeno/_) unifies data in motion, data at rest and computations. It carefully blends traditional pub/sub with geo-distributed storages, queries and computations, while retaining a level of time and space efficiency that is well beyond any of the mainstream stacks.

Check the website [zenoh.io](http://zenoh.io) and the [roadmap](https://github.com/eclipse-zenoh/roadmap) for more detailed information.

---

# Typescript/Javascript API

This repository provides a Typscript / Javascript binding through the use of the `remote-api-plugin` in this repo. 
The long term plan is to use zenoh [Zenoh written in Rust](https://github.com/eclipse-zenoh/zenoh) to target WASM.  
In its current state, it is not possible to compile Zenoh (Rust) to target WASM, and will need to undergo a fair amount of refactoring before that can happen.

Docs can be accessed at [Docs Link](https://eclipse-zenoh.github.io/zenoh-ts/)

---

## How to build and run it

> :warning: **WARNING** :warning: : Zenoh and its ecosystem are under active development. When you build from git, make sure you also build from git any other Zenoh repository you plan to use (e.g. binding, plugin, backend, etc.). It may happen that some changes in git are not compatible with the most recent packaged Zenoh release (e.g. deb, docker, pip). We put particular effort in maintaining compatibility between the various git repositories in the Zenoh project.

## Executing the `zenohd` with `zenoh-plugin-remote-api` plugin

The `zenohd` router and its pluigns should be built with the same zenoh sources and the same version of rust compiler with the same set of features.
This requirement exists because router and plugins shares common Rust structures and Rust doesn't guarantee the ABI compatibility of
memory representation of these structures.

Therefore one of these methods is recommended:

1. Install latest release of `zenohd` and `zenoh-plugin-remote-api`

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

  Run installed zenoh router with example config

  ```sh
  zenohd --config EXAMPLE_CONFIG.json5
  ```
  
  Expected output for is like:

  ```txt
  zenohd: zenohd v1.0.3 built with rustc 1.75.0 (82e1608df 2023-12-21)
  zenoh::net::runtime: Using ZID: f7bc54e0941036422ec08ebac6fbdb40
  zenoh::api::loader: Loading  plugin "remote_api"
  zenoh::api::loader: Starting  plugin "remote_api"
  zenoh::api::loader: Successfully started plugin remote_api from "/usr/lib/libzenoh_plugin_remote_api.so"
  zenoh::api::loader: Finished loading plugins
  zenoh::net::runtime::orchestrator: Zenoh can be reached at: tcp/....
  ```

1. Build the plugin and the router from the sources:

  Build the `zenoh-plugin-remote-api`

  ```sh
  cargo build 
  ```

  Build and run the zenohd from the same sources which were used for the plugin.
  The zenohd dependency is specified in `[workspace.metadata.bin]` section in Cargo.toml and processed by the 3-rd party tool [cargo-run-bin](https://crates.io/crates/cargo-run-bin).

  ```sh
  cargo install cargo-run-bin
  cargo bin zenohd --config EXAMPLE_CONFIG.json5
  ```  

  Expected output is like:

  ```txt
  zenohd: zenohd vc764bf9b built with rustc 1.75.0 (82e1608df 2023-12-21)
  zenoh::net::runtime: Using ZID: bb3fb16628f57e92f92accf2f5c81511
  zenoh::api::loader: Loading  plugin "remote_api"
  zenoh::api::loader: Starting  plugin "remote_api"
  zenoh::api::loader: Successfully started plugin remote_api from "./target/debug\\zenoh_plugin_remote_api.dll"
  zenoh::api::loader: Finished loading plugins
  zenoh::net::runtime::orchestrator: Zenoh can be reached at: ...
  ```

## Building the Typescript project

1. Make sure that the following utilities are available on your platform. 

- [NPM](https://www.npmjs.com/package/npm)
- [yarn](https://classic.yarnpkg.com/lang/en/docs/install/#debian-stable)
- [Typescript](https://www.typescriptlang.org/download/) 

1. Navigate to the directory `zenoh-ts`

1. Run the commands:

```sh
yarn install 
yarn run build
```

## Build and run the command line examples

This library is currently compatible with browsers, but not with NodeJS due to websocket library limitations.
To run the command line examples use javascript runtime [deno](https://deno.com/) which is expected be consistent with the browser.

1. Install [deno](https://deno.com/)
1. Navigate to the `zenoh-ts/examples/deno` directory
1. Install `zenoh-ts` library by running `yarn install`
1. Run zenohd with remote_api plugin, configured to websocket port 10000, as described above
1. Run the examples by running `yarn example <PATH TO EXAMPLE>`, i.e. `yarn example src/z_sub.ts`

E.g. in different sessions run publisher and subcriber examples:

```sh
yarn example src/pub.rs
```

```sh
yarn example src/sub.rs
```

The subscriber should start to receive messages from publisher

This will start an instance of Deno running the example.
The application will attempt to connect to a `websocket_port` : `10000` where the Remote API plugin is expected to be running.  

## Adding Typescript to your application

The TypeScript library can be install from the command line: 

```sh
npm install @eclipse-zenoh/zenoh-ts@0.0.8
````

Or added via package.json

`"@eclipse-zenoh/zenoh-ts": "0.0.8" `

Note: In order to add this library to your project you must log into the github npm repository,  
please refer to this link for more information [Accessing github NPM](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-npm-registry#authenticating-with-a-personal-access-token)


[zenoh]: https://github.com/eclipse-zenoh/zenoh


