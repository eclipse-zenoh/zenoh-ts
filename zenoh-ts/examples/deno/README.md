<img src="https://raw.githubusercontent.com/eclipse-zenoh/zenoh/master/zenoh-dragon.png" height="150">

> :warning: **This is a WIP Active development project**: Experiment with with it, but it is **Not** production Ready!

[![Discord](https://img.shields.io/badge/chat-on%20discord-blue)](https://discord.gg/2GJ958VuHs)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

# Eclipse Zenoh Typescript / Javascript API

The Eclipse Zenoh: Zero Overhead Pub/sub, Store/Query and Compute.

Zenoh (pronounce _/zeno/_) unifies data in motion, data at rest and computations. It carefully blends traditional pub/sub with geo-distributed storages, queries and computations, while retaining a level of time and space efficiency that is well beyond any of the mainstream stacks.

Check the website [zenoh.io](http://zenoh.io) and the [roadmap](https://github.com/eclipse-zenoh/roadmap) for more detailed information.

:warning: Note: This library does not support NodeJS.
To run on the backend its recommended either to use [deno](https://deno.com/) or check out the differnt language bindings

---

# Typescript/Javascript API

This repository provides a Typscript / Javascript binding through the use of the `remote-api-plugin` in this repo.
The long term plan is to use zenoh [Zenoh written in Rust](https://github.com/eclipse-zenoh/zenoh) to target WASM.  
In its current state, it is not possible to compile Zenoh (Rust) to target WASM, and will need to undergo a fair amount of refactoring before that can happen.

---

## How to Build and Run the examples

The example project is a Web project using [Vite](https://vite.dev/)

In order to run the example project the user must:

1. Build the Typescript Library
2. Build + Run the remote-api-plugin  
3. Build + Run the examples

### 1. Build the Typescript Library  

From project root directory:  

1. Navigate to the `/zenoh-ts` directory  
2. Build the `zenoh-ts` bindings by running `yarn install && yarn build`  

### 2. Build + Run the remote-api-plugin  

From project root directory:  

1. Build the plugin by running `cargo build`  
2. Run an instance of `zenohd` loading the plugin `zenohd --config ./zenoh-plugin-remote-api/EXAMPLE_CONFIG.json5` with the following config

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

The latest version of `zenohd` can be build from source from [zenoh](https://github.com/eclipse-zenoh/zenoh/)
or downloaded from the [release](https://github.com/eclipse-zenoh/zenoh/releases) page for your platform.
Keep this terminal running while building and running the example below

### 3. Build + run the examples

The most simple way to run examples is to install [deno](https://deno.com/), and run each example individually.  

1. Install [deno](https://deno.com/)
2. Install CLI parsing of arguments for deno : `deno add jsr:@std/cli`
3. Navigate to the `/zenoh-ts/examples/deno` directory
4. Install `zenoh-ts` library by running `yarn install`
5. Then run the examples by running `yarn example <PATH TO EXAMPLE>`, i.e. `yarn example src/z_sub.ts`

This will start an instance of Deno running the example.
The application will attempt to connect to a `websocket_port` : `10000` where the Remote API plugin is expected to be running.  
The javascript runtime [deno](https://deno.com/) is expected be consistent with the browser.
Note: This library does not support NodeJS

### Clean projects

To reset state of the project from the top level directory run
`cargo clean && cd zenoh-ts && yarn clean && cd examples && yarn clean`
