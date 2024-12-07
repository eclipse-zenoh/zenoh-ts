# Zenoh-ts Chat Example

This example demonstrates usage of zenoh-ts library in real web application.

To start the example follow these steps:

1. Build the zenoh-ts library (see root [README](../../README.md))

1. Start zenohd with websocket plugin (see root [README](../../README.md))

1. Build and run chat example. Browser window should automatically open

   ```sh
   npm install
   npm run build
   npm run start
   ```

The example uses "importmap" approach to run the project. This means that the javascript code
is loaded by browser directly, without any additional bundling. This is done purposedly to
verify that library is ready to be used in browser without additional tooling.

Note though that dependent libraries are loaded from the cloud instead of local node_modules in this approach.
This is necessary because some of them (especially `channel-ts`) is written with CommonJS module
loading system and can't work in browser without repacking.
