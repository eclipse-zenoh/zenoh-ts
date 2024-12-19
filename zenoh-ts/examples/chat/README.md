# Zenoh-ts Chat Example

This example demonstrates usage of zenoh-ts library in real web application.

To start the example follow these steps:

1. Build the zenoh-ts library (see root [README](../../README.md))

2. Start zenohd with websocket plugin (see root [README](../../README.md))

3. Build and run chat example. Browser window should automatically open

   ```sh
   yarn install
   yarm build
   yarn start
   ```

4. Open second browser window on the same address, connect to server and test the chat

The example uses "importmap" approach to run the project. This means that the javascript code
is loaded by browser directly, without additional bundling. This is done purposely to
verify that the zenoh-ts library is ready to be used in browser without additional tooling.

Note though that not all dependent libraries follows this rule. Some of them (e.g. `channel-ts`)
can be used directly in browser only after proper repacking. So when using importmap approach
the dependent libraries are loaded from the [jspm.io](https://jspm.org/cdn/jspm-io)
