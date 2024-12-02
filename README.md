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

The `zenohd` router and its pluigns should be built with exactly the same version of rust compiler with the same set of features.
This requirement exists because router and plugins shares common Rust structures and Rust doesn't guarantee the ABI compatibility of
memory representation of these structures.

Therefore one of these methodds are recommended:

1. Install latest release of `zenohd` and `zenoh-plugin-remote-api`

  Ubuntu:

  ```sh
  echo "deb [trusted=yes] https://download.eclipse.org/zenoh/debian-repo/ /" | sudo tee -a /etc/apt/sources.list.d/zenoh.list > /dev/null
  sudo apt update
  sudo apt install zenohd
  sudo apt install zenoh-plugin-remote-api
  ```

  ```sh
  zenohd
  ```

2. Build `zenoh-plugin-remote-api` locally and build and run exactly the same zenohd version as the one which is used for building the plugin.
The 3-rd party tool https://crates.io/crates/cargo-run-bin is used to build and run zenohd version local to project (in `.bin` directory)

  ```sh
  cargo install cargo-run-bin
  cargo bin -i zenohd
  ```

  ```sh
  cargo bin zenohd
  ```  

## Building the Typescript project

1. Make sure that the following utilities are available on your platform. 
 - [NPM](https://www.npmjs.com/package/npm)
 - [yarn](https://classic.yarnpkg.com/lang/en/docs/install/#debian-stable)
 - [Typescript](https://www.typescriptlang.org/download/) 

2. Navigate to the directory `zenoh-ts`

3. Run the commands:

```bash
  yarn install 
  # 
  yarn run build
```

## Building the Rust Plugin

1. Make sure that the following utilities are available on your platform. 
 - [Cargo + Rust Compiler](https://rustup.rs/)

2. Navigate to `zenoh-plugin-remote-api`

3. Run `cargo build`

## **Examples of usage**

### Running the Rust Plugin

Prerequisites:
 - You have a zenoh router (`zenohd`) installed, and the `zenoh_plugin_remote_api` library file is available in `~/.zenoh/lib`.

### **Setup via a JSON5 configuration file**

  - Create a `zenoh.json5` configuration file containing for example:
    ```json5
    {
      plugins: {
        // configuration of "storage_manager" plugin:
        remote_api: {
          "websocket_port": "10000",
          // secure_websocket configuration is optional
          "secure_websocket": {
                "certificate_path" : "/path/to/certificate",
                "private_key_path" : "/path/to/private_key"
          }
        }
        // Optionally, add the REST plugin
        rest: { http_port: 8000 }
      }
    }
    ```
  - Run the zenoh router with:
    `zenohd -c zenoh.json5`

## Adding Typescript to your application

The TypeScript library can be install from the command line: 

`npm install @eclipse-zenoh/zenoh-ts@0.0.8`

Or added via package.json

`"@eclipse-zenoh/zenoh-ts": "0.0.8" `

Note: In order to add this library to your project you must log into the github npm repository,  
please refer to this link for more information [Accessing github NPM](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-npm-registry#authenticating-with-a-personal-access-token)


[zenoh]: https://github.com/eclipse-zenoh/zenoh


