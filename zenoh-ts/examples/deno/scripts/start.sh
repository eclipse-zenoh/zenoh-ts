#!/usr/bin/env bash

ORIGINAL_DIR="$(pwd)"
SCRIPTDIR="$(cd "$(dirname "$0")" >/dev/null 2>&1 && pwd)"
cd "$SCRIPTDIR/.."

if [ "$1" = "" ]; then
  echo
  echo "Arguments: example_name"
  echo "  example_name: name of the example to run"
  echo
  echo "Available examples:"
  ls src/*.ts | sed -e "s/src\///" -e "s/\.ts//"
  echo
else
  EXAMPLE_NAME="$1"
  shift
  deno run -A --no-prompt "src/$EXAMPLE_NAME.ts" "$@"
  EXIT_CODE=$?
fi

cd "$ORIGINAL_DIR"
exit ${EXIT_CODE:-0}