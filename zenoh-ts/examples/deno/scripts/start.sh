#!/usr/bin/env bash

ORIGINAL_DIR="$(pwd)"
SCRIPTDIR="$(cd "$(dirname "$0")" >/dev/null 2>&1 && pwd)"
cd "$SCRIPTDIR/.."

if [ "$1" = "" ]; then
  echo
  echo "Available options:"
  echo
  ls src/*.ts | sed -e "s/src\///" -e "s/\.ts//"
  echo
else
  deno run -A --no-prompt src/$1.ts "${@:2}"
fi

cd "$ORIGINAL_DIR"