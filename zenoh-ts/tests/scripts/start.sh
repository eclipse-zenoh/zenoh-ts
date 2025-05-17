#!/usr/bin/env bash

ORIGINAL_DIR="$(pwd)"
SCRIPTDIR="$(cd "$(dirname "$0")" >/dev/null 2>&1 && pwd)"
cd "$SCRIPTDIR/.."

if [ "$1" = "" ]; then
  echo
  echo "Arguments: test_name|ALL"
  echo "  test_name: name of the test to run or ALL to run all tests"
  echo
  echo "Available tests:"
  ls src/*.ts | sed -e "s/src\///" -e "s/\.ts//"
  echo
else
  EXIT_CODE=0

  if [ "$1" = "ALL" ]; then
    deno test -A src/*.ts
    EXIT_CODE=$?
  else
    deno test -A "src/$1.ts"
    EXIT_CODE=$?
  fi
fi

cd "$ORIGINAL_DIR"
exit ${EXIT_CODE:-0}