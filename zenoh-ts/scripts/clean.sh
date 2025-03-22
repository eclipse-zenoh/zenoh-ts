#!/bin/sh

SCRIPTDIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
pushd "$SCRIPTDIR/.."

rm -rf ./node_modules ./dist ./esm 
pushd examples/deno && yarn clean || exit 1 && popd
pushd examples/browser/chat && yarn clean || exit 1 && popd

popd