#!/usr/bin/env bash

ORIGINAL_DIR="$(pwd)"
SCRIPTDIR="$(cd "$(dirname "$0")" >/dev/null 2>&1 && pwd)"
cd "$SCRIPTDIR/.."

if [ "$1" = "" ]; then
  echo
  echo "Available tests. Pass 'ALL' to run all tests:"
  echo
  ls src/*.ts | sed -e "s/src\///" -e "s/\.ts//"
  echo
else
  if [ "$1" = "ALL" ]; then
    for test in src/*.ts; do
      deno run -A --no-prompt $test
    done
  else
    deno run -A --no-prompt src/$1.ts
  fi
fi

cd "$ORIGINAL_DIR"