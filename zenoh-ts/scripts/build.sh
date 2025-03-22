#!/bin/bash

SCRIPTDIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
pushd "$SCRIPTDIR/.."

# install dependencies if needed
if [ ! -d "./node_modules" ]; then
  yarn install || exit 1
fi

# build wasm module
pushd ../zenoh-keyexpr-wasm
cargo install wasm-pack || exit 1
wasm-pack build --target bundler --out-dir ../zenoh-ts/src/key_expr || exit 1
popd

# compile typescript and copy wasm module
npx tsc || exit 1
cp ./src/key_expr/*wasm* ./dist/key_expr/

popd