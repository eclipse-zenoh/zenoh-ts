#!/usr/bin/env bash

ORIGINAL_DIR="$(pwd)"
EXIT_CODE=0
SCRIPTDIR="$(cd "$(dirname "$0")" >/dev/null 2>&1 && pwd)"
cd "$SCRIPTDIR/.."

start_daemon() {
  CURRENT_DIR="$(pwd)"
  cd "$SCRIPTDIR/../.."
  cargo build --release
  cargo bin -i zenohd
  ZENOHD=$(find ./.bin/rust-* -name "zenohd" -type f | head -n 2)
  if [ $(echo "$ZENOHD" | wc -l) -ne 1 ]; then
    echo "Error: More than one or no 'zenohd' file found in ./.bin/rust-* directories:"
    echo "$ZENOHD"
    exit 1
  fi
  echo "\"$ZENOHD\" --config EXAMPLE_CONFIG.json5"
  "$ZENOHD" --config EXAMPLE_CONFIG.json5 &

  ZPID=$!
  echo "zenohd started with PID $ZPID"
  sleep 5

  if ! ps -p $ZPID > /dev/null; then
    echo "Error: zenohd process not found"
    exit 1
  fi

  # Trap SIGINT to ensure zenohd is killed on ^C
  trap "echo 'Stopping zenohd with PID $ZPID'; kill $ZPID; exit 1" SIGINT

  cd "$CURRENT_DIR"
}

stop_daemon() {
  if [ ! -z "$ZPID" ]; then
    echo "Stopping zenohd with PID $ZPID"
    kill "$ZPID"
  fi
}

# run build if needed
if [ ! -d "./dist" ]; then
  yarn build || exit 1
fi

# Check if DAEMON is the first argument
USE_DAEMON=0
if [ "$1" = "DAEMON" ]; then
  USE_DAEMON=1
  shift
fi

if [ "$1" = "test" ]; then
  cd tests
  yarn install || exit 1
  if [ $USE_DAEMON -eq 1 ]; then
    start_daemon
  fi
  yarn start "${@:2}"
  EXIT_CODE=$?
elif [ "$1" = "example" ] && [ "$2" = "deno" ]; then
  cd examples/deno
  yarn install || exit 1
  if [ $USE_DAEMON -eq 1 ]; then
    start_daemon
  fi
  yarn start "${@:3}"
  EXIT_CODE=$?
elif [ "$1" = "example" ] && [ "$2" = "browser" ] && [ "$3" = "" ]; then
  # there is only "chat" example for now, but later list of examples can be shown
  cd examples/browser/chat
  yarn install || exit 1
  if [ $USE_DAEMON -eq 1 ]; then
    start_daemon
  fi
  yarn start
  EXIT_CODE=$?
else
  echo
  echo "Available options:"
  echo
  echo "yarn start [DAEMON] test [test-name|ALL]"
  echo "yarn start [DAEMON] example deno [example-name]"
  echo "yarn start [DAEMON] example browser"
  echo
fi

stop_daemon

cd "$ORIGINAL_DIR"

# Disable debug command tracing
set +x

exit $EXIT_CODE