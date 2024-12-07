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

The example uses "importmap" approach to run the project. This is done purposedly to
verify that library is ready to work directly in browser without any additional bundling.

Note thought that dependent libraries are loaded from the cloud instead of local node_modules in this approach.
This is necessayr because some of them (especially `channel-ts`) is written with CommonJS module
loading system and can't work in browser without repacking.
