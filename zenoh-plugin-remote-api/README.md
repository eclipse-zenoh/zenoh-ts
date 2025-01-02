<img src="https://raw.githubusercontent.com/eclipse-zenoh/zenoh/main/zenoh-dragon.png" height="150">

[![Discussion](https://img.shields.io/badge/discussion-on%20github-blue)](https://github.com/eclipse-zenoh/roadmap/discussions)
[![Discord](https://img.shields.io/badge/chat-on%20discord-blue)](https://discord.gg/2GJ958VuHs)
[![License](https://img.shields.io/badge/License-EPL%202.0-blue)](https://choosealicense.com/licenses/epl-2.0/)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

# Eclipse Zenoh

The Eclipse Zenoh: Zero Overhead Pub/sub, Store/Query and Compute.

Zenoh (pronounce _/zeno/_) unifies data in motion, data at rest and computations. It carefully blends traditional pub/sub with geo-distributed storages, queries and computations, while retaining a level of time and space efficiency that is well beyond any of the mainstream stacks.

Check the website [zenoh.io](http://zenoh.io) and the [roadmap](https://github.com/eclipse-zenoh/roadmap) for more detailed information.

-------------------------------

# Remote API Plugin

In Zenoh, the remote API plugin is an library loaded into a Zenohd instance at start up, which allows the creation of a Session, declaration of zenoh resources (Subscribers, Publishers, Queryables) remotely via websockets, for runtime environments where it is currently unsupported to run a zenoh binary.
The Remote API was designed to support the Typescript Zenoh bindings, running in a browser.

-------------------------------

## **Examples of usage**

Prerequisites:

- You have a zenoh router (`zenohd`) installed, and the `libzenoh_plugin_remote_api.so` library file is available in `~/.zenoh/lib` or `~/target/debug`.

### **Setup via a JSON5 configuration file**

- Create a `zenoh.json5` configuration file containing for example:

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

- Run the zenoh router with: `zenohd -c EXAMPLE_CONFIG.json5`

-------------------------------

## How to build it

> :warning: **WARNING** :warning: : Zenoh and its ecosystem are under active development. When you build from git, make sure you also build from git any other Zenoh repository you plan to use (e.g. binding, plugin, backend, etc.). It may happen that some changes in git are not compatible with the most recent packaged Zenoh release (e.g. deb, docker, pip). We put particular effort in mantaining compatibility between the various git repositories in the Zenoh project.

At first, install [Cargo and Rust](https://doc.rust-lang.org/cargo/getting-started/installation.html). If you already have the Rust toolchain installed, make sure it is up-to-date with:

```bash
rustup update
```

> :warning: **WARNING** :warning: : As Rust doesn't have a stable ABI, the backend library should be
built with the exact same Rust version than `zenohd`, and using for `zenoh` dependency the same version (or commit number) than 'zenohd'.
Otherwise, incompatibilities in memory mapping of shared types between `zenohd` and the library can lead to a `"SIGSEV"` crash.

To know the Rust version you're `zenohd` has been built with, use the `--version` option.

### Example with a downloaded zenohd

```bash
$ zenohd --version
zenohd v1.0.0-beta.2 built with rustc 1.75.0 (82e1608df 2023-12-21)
```

Here, `zenohd` is version `v1.0.0-beta.2` has been built with the rustc version `1.75.0`.  
Install and use this same toolchain with the following command:

```bash
rustup default 1.75.0
```

And edit the update `Cargo.toml` file to make all the `zenoh` dependencies to use the same version number:

```toml
zenoh = { version = "v1.0.0-beta.2", features = [ "unstable" ] }
```

Then build the plugin:  

```bash
cargo build --release --all-targets -p zenoh-plugin-remote-api
```

### Example with a version built from sources

```bash
$ zenohd --version
zenohd v1.0.0-beta.2 built with rustc 1.75.0 (82e1608df 2023-12-21)
```

Here, `zenohd` version is `v1.0.0-beta.2` where:

- `v1.0.0-beta.2` means it's a development version for the future `v1.0.0` release
- `82e1608df` indicates the commit hash
- And it has been built with the `rustc` version `1.75.0`.  

Install and use this same toolchain with the following command:

```bash
rustup default 1.75.0
```
