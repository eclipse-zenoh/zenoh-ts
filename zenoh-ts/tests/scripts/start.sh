#!/usr/bin/env bash

ORIGINAL_DIR="$(pwd)"
SCRIPTDIR="$(cd "$(dirname "$0")" >/dev/null 2>&1 && pwd)"
cd "$SCRIPTDIR/.."

if [ "$1" = "" ]; then
  echo
  echo "Arguments: test_name|ALL [DAEMON]"
  echo "  test_name: name of the test to run or ALL to run all tests"
  echo "  DAEMON: start the zenoh daemon before running the test"
  echo
  echo "Available tests:"
  ls src/*.ts | sed -e "s/src\///" -e "s/\.ts//"
  echo
else
  if [ "$2" = "DAEMON" ]; then
    cd "$SCRIPTDIR/../../.."
    cargo build --release
    cargo bin -i zenohd
    ZENOHD=$(find ./.bin -name "zenohd" -type f | head -n 1)
    if [ -z "$ZENOHD" ]; then
      echo "zenohd not found in .bin directory"
      exit 1
    fi
    pwd
    echo "\"$ZENOHD\" --config EXAMPLE_CONFIG.json5"
    "$ZENOHD" --config EXAMPLE_CONFIG.json5 &

    ZPID=$!
    echo "zenohd started with PID $ZPID"
    sleep 1
    cd "$SCRIPTDIR/.."

    # Trap SIGINT to ensure zenohd is killed on ^C
    trap "echo 'Stopping zenohd with PID $ZPID'; kill $ZPID; exit 1" SIGINT
  fi

  EXIT_CODE=0

  if [ "$1" = "ALL" ]; then
    for test in src/*.ts; do
      deno run -A --no-prompt "$test"
      if [ $? -ne 0 ]; then
        EXIT_CODE=1
      fi
    done
  else
    deno run -A --no-prompt "src/$1.ts"
    if [ $? -ne 0 ]; then
      EXIT_CODE=1
    fi
  fi

  if [ ! -z "$ZPID" ]; then
    echo "Stopping zenohd with PID $ZPID"
    kill "$ZPID"
  fi
fi

cd "$ORIGINAL_DIR"
exit $EXIT_CODE