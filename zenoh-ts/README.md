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

---

## How to build it

> :warning: **WARNING** :warning: : Zenoh and its ecosystem are under active development. When you build from git, make sure you also build from git any other Zenoh repository you plan to use (e.g. binding, plugin, backend, etc.). It may happen that some changes in git are not compatible with the most recent packaged Zenoh release (e.g. deb, docker, pip). We put particular effort in maintaining compatibility between the various git repositories in the Zenoh project.

1. Make sure that the following utilities are available on your platform.

   - [NPM](https://www.npmjs.com/package/npm)
   - [yarn](https://classic.yarnpkg.com/lang/en/docs/install/#debian-stable)
   - [Typescript](https://www.typescriptlang.org/download/)

2. Navigate to the directory `zenoh-ts`

3. Run the commands:

```bash
yarn install 
yarn run build
```

## Adding Typescript to your application

The TypeScript library can be install from the command line:

`npm install @eclipse-zenoh/zenoh-ts@0.0.8`

Or added via package.json

`"@eclipse-zenoh/zenoh-ts": "0.0.8"`

Note: In order to add this library to your project you must log into the github npm repository,  
please refer to this link for more information [Accessing github NPM](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-npm-registry#authenticating-with-a-personal-access-token)

## Generating Documentation

1. Make sure that the [typedoc](https://typedoc.org/) dependency is installed.

2. Navigate to the directory `zenoh-ts`

3. Run the commands:

```bash
npx typedoc src/index.ts
```

## Build + run the examples

The most simple way to run examples is to install [deno](https://deno.com/), and run each example individually via the command line.  

1. Install [deno](https://deno.com/)
2. Navigate to the `/zenoh-ts/examples` directory
3. Install `zenoh-ts` library by running `yarn install`
4. Start a `zenohd` instance with the Remote API plugin running `zenohd --config EXAMPLE CONFIG.json`

    ```json
    {
      mode: 'router',
      plugins_loading: {
        enabled: true,
        search_dirs: ['./target/debug', '~/.zenoh/lib']
      },
      plugins: {
        remote_api: {
          websocket_port: '10000',
        }
      }
    }
    ```

5. Then run the examples by running `yarn run <PATH TO EXAMPLE>`, i.e. `yarn example src/z_sub.ts`

This will start an instance of Deno running the example.
The application will attempt to connect to a `websocket_port` : `10000` where the Remote API plugin is expected to be running.  
The javascript runtime [deno](https://deno.com/) is expected be consistent with the browser.
Note: This library does not support NodeJS
