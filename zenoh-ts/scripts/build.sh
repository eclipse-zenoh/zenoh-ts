#!/usr/bin/env bash

ORIGINAL_DIR="$(pwd)"
SCRIPTDIR="$(cd "$(dirname "$0")" >/dev/null 2>&1 && pwd)"
cd "$SCRIPTDIR/.."

# install dependencies if needed
if [ ! -d "./node_modules" ]; then
  yarn install || exit 1
fi

# build wasm module
cd ../zenoh-keyexpr-wasm
cargo install wasm-pack || exit 1
wasm-pack build --target bundler --out-dir ../zenoh-ts/src/key_expr || exit 1
cd "$SCRIPTDIR/.."

# compile typescript and copy wasm module
npx tsc || exit 1
cp ./src/key_expr/*wasm* ./dist/key_expr/

# build tests
cd tests
# yarn install works too but test coverage works only with deno install
deno install || exit 1
yarn verify || exit 1
cd "$SCRIPTDIR/.."

# build examples/deno
cd examples/deno
deno install || exit 1
yarn verify || exit 1
cd "$SCRIPTDIR/.."

# build examples/browser
cd examples/browser/chat
yarn install || exit 1
yarn build || exit 1
cd "$SCRIPTDIR/.."

cd "$ORIGINAL_DIR"