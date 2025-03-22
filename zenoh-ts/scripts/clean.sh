#!/bin/bash

ORIGINAL_DIR="$(pwd)"
SCRIPTDIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$SCRIPTDIR/.."

rm -rf ./node_modules ./dist ./esm
cd examples/deno && yarn clean || exit 1 && cd "$SCRIPTDIR/.."
cd examples/browser/chat && yarn clean || exit 1 && cd "$SCRIPTDIR/.."

cd "$ORIGINAL_DIR"