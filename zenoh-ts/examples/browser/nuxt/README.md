# Zenoh-ts Nuxt Example

This example demonstrates how to use zenoh-ts in a Nuxt 3.17.4 application with WebAssembly support.

## Features

### Connection Management
- Connect to Zenoh router via WebSocket
- Real-time connection status indicator  
- Proper connection state management

### Zenoh Operations
- **Put**: Store key-value pairs in the Zenoh network
- **Get**: Retrieve values using selectors
- **Subscribe**: Real-time data updates with live subscriptions

### Operation Logging
- Real-time operation logs with timestamps
- Color-coded log types (INFO, SUCCESS, ERROR, DATA)
- Clear logs functionality for better debugging

## Quick Start

### 1. Install Dependencies

```bash
# npm
npm install

# pnpm
pnpm install

# yarn
yarn install
```

### 2. Start Development Server

Start the development server on `http://localhost:3000`:

```bash
# npm
npm run dev

# pnpm
pnpm dev

# yarn
yarn dev
```

## Testing with Zenoh Router

To fully test the application, you need a Zenoh router running:

### 1. Install Zenoh Router

```bash
# Using cargo (recommended)
cargo install zenoh --features=router

# Or download binary from GitHub releases
# https://github.com/eclipse-zenoh/zenoh/releases
```

### 2. Start the Router

Start the router with WebSocket support:

```bash
zenohd --cfg='listeners: ["tcp/0.0.0.0:7447", "ws/0.0.0.0:10000"]'
```

### 3. Connect from Web Application

1. Open `http://localhost:3000` in your browser
2. Use the default URL: `ws://localhost:10000`  
3. Click "Connect"
4. Start testing the operations!

## Example Usage

1. **Connect** to the router at `ws://localhost:10000`
2. **Put** some data: 
   - Key: `demo/example/test`
   - Value: `Hello World`
3. **Subscribe** to updates: `demo/example/**`
4. **Get** data using selector: `demo/example/*`

## Technical Implementation

### WebAssembly Support
This example includes proper WebAssembly configuration:
- `vite-plugin-wasm` for WebAssembly module loading
- `vite-plugin-top-level-await` for async module imports
- Local zenoh-ts package integration

### Project Structure
- **nuxt.config.ts**: Vite plugins configuration for WASM support
- **package.json**: Dependencies including local zenoh-ts package
- **app.vue**: Complete Vue.js interface with zenoh-ts integration

## Production Build

Build the application for production:

```bash
# npm
npm run build

# pnpm
pnpm build

# yarn
yarn build
```

## Troubleshooting

### Connection Issues

- **Router not running**: Ensure Zenoh router is started with WebSocket support
- **Wrong URL format**: Use `ws://host:port` format (default: `ws://localhost:10000`)
- **CORS issues**: If connecting to remote router, verify CORS settings
- **Port conflicts**: Check if port 10000 is available or use different port

### Build Issues

- **Dependencies**: Ensure all dependencies are installed with `npm install`
- **Node.js version**: Verify compatibility with Node.js 18+
- **WebAssembly support**: Check if your browser supports WebAssembly
- **Local package**: Verify zenoh-ts package is built in parent directory

### Browser Compatibility

- Modern browsers with WebAssembly support
- WebSocket support required
- ES2020+ JavaScript support

## Development Notes

### Key Components

- **Connection management**: Reactive Vue state for Zenoh session
- **Operation handlers**: Put, Get, Subscribe implementations
- **Real-time logging**: Live operation feedback with timestamps
- **Error handling**: Proper error catching and user feedback

### Zenoh Integration

- Uses local zenoh-ts package from `file:../../..`
- WebAssembly bindings for key expression handling
- WebSocket transport for browser compatibility
- Reactive subscriptions with Vue.js integration

## Next Steps

This example demonstrates basic Zenoh operations. You can extend it with:

- Publisher/Subscriber patterns
- Queryable services
- Liveliness monitoring
- Configuration management
- Multiple router connections

For more advanced usage, see the [zenoh-ts documentation](../../../README.md).
