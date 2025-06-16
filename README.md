<img src="https://raw.githubusercontent.com/eclipse-zenoh/zenoh/master/zenoh-dragon.png" height="150">

[![Discord](https://img.shields.io/badge/chat-on%20discord-blue)](https://discord.gg/2GJ958VuHs)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

# Eclipse Zenoh TypeScript / JavaScript API

Eclipse Zenoh: Zero Overhead Pub/sub, Store/Query, and Compute.

Zenoh (pronounced _/zeno/_) unifies data in motion, data at rest, and
computations. It carefully blends traditional pub/sub with geo-distributed
storage, queries, and computations, while retaining a level of time and space
efficiency that is well beyond any of the mainstream stacks.

Check the website [zenoh.io](http://zenoh.io) and the
[roadmap](https://github.com/eclipse-zenoh/roadmap) for more detailed
information.

---

## TypeScript/JavaScript API

This repository provides TypeScript / JavaScript bindings through the use of
the `zenoh-plugin-remote-api`. The long-term plan is to use
[Zenoh written in Rust](https://github.com/eclipse-zenoh/zenoh) to target WASM.
In its current state, it is not possible to compile Zenoh (Rust) to target WASM,
and it will need to undergo a fair amount of refactoring before that can happen.

The latest version of the zenoh-ts library can be installed from npm:

```sh
npm install @eclipse-zenoh/zenoh-ts
```

Documentation can be accessed at [Docs Link](https://eclipse-zenoh.github.io/zenoh-ts/)

The library requires a WebSocket connection to the `zenohd` daemon through the
`zenoh-plugin-remote-api` plugin in the daemon. See the corresponding section below.

---

## How to build and use zenoh-ts

### Executing the remote-api plugin

The `zenoh-ts` library accesses the zenoh network by establishing a WebSocket connection to
the `zenoh-plugin-remote-api` plugin of the zenoh router `zenohd`.

There is also a standalone executable `zenoh-bridge-remote-api`. This is in fact
the same `zenohd` statically linked with `zenoh-plugin-remote-api` and providing convenient
specific command-line options, e.g. `--ws-port`.

Examples:

Run bridge on WebSocket port 8080:

```sh
cargo run -- --ws-port 8080
```

Run bridge on default port 10000:

```sh
cargo run
```

Get help:

```sh
cargo run -- --help
```

For information about dynamically-loading plugin usage, see [zenoh-plugin-remote-api/README.md](zenoh-plugin-remote-api/README.md).

### Building the library from sources

1. Make sure that the following utilities are available on your platform:

   - [NPM](https://www.npmjs.com/package/npm)
   - [yarn](https://classic.yarnpkg.com/lang/en/docs/install/#debian-stable)
   - [TypeScript](https://www.typescriptlang.org/download/)
   - [Rust](https://www.rust-lang.org)
   - [deno](https://deno.com/) - for command line examples

2. Navigate to the directory `zenoh-ts`

3. Run the commands:

   ```sh
   yarn install 
   yarn build
   ```

   The result is placed into the `zenoh-ts/dist` directory.

   Note: `yarn build` defaults to building the library. You can also specify
   components explicitly: `yarn build library`, `yarn build tests`,
   `yarn build examples`, or `yarn build ALL` for everything. See all available options by running
   `yarn build --help`.

   This library is currently compatible with browsers, but not with Node.js due
   to WebSocket library limitations.

### Build and run examples

For simplicity, the examples can be executed from the `zenoh-ts` directory. You
may also go directly to the `zenoh-ts/examples` directory to explore and run
examples there.

The examples are configured to access the remote-api plugin on `ws://localhost:10000`. To run it, just execute `cargo run` or pass the `DAEMON` parameter to yarn as shown below.

To run an example, execute the command `yarn start [DAEMON] example deno [example_name]` or `yarn start [DAEMON] example browser [example_name]`.

The following examples are available:

- Command line examples
  - Publisher and subscriber:

    ```sh
    yarn start DAEMON example deno z_pub
    yarn start DAEMON example deno z_sub
    ```

  - Queryable and get:

    ```sh
    yarn start DAEMON example deno z_queryable
    yarn start DAEMON example deno z_get
    ```

    and many more

- Chat in browser example:

  ```sh
  yarn start DAEMON example browser
  ```

  A browser window at [localhost:8080](http://127.0.0.1:8080/index.html) with
  the chat interface should open. Open another window with the same address, press
  the "Connect" buttons in both and see how they interact.

### Generating Documentation

1. Make sure that the [typedoc](https://typedoc.org/) dependency is installed.

2. Navigate to the directory `zenoh-ts`.

3. Run the command:

```bash
npx typedoc src/index.ts
```
