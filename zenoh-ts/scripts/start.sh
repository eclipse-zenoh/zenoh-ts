#!/usr/bin/env bash

ORIGINAL_DIR="$(pwd)"
EXIT_CODE=0
SCRIPTDIR="$(cd "$(dirname "$0")" >/dev/null 2>&1 && pwd)"
cd "$SCRIPTDIR/.."

start_daemon() {
  CURRENT_DIR="$(pwd)"
  cd "$SCRIPTDIR/../.."
  
  # Start cargo run in background
  cargo build --release || exit 1
  ./target/release/zenoh-bridge-remote-api &

  ZPID=$!
  echo "zenoh-bridge-remote-api started with PID $ZPID"
  sleep 5

  if ! ps -p $ZPID > /dev/null; then
    echo "Error: zenoh-bridge-remote-api process not found after 10 seconds"
    exit 1
  fi

  # Trap SIGINT to ensure both processes are killed on ^C
  trap "echo 'Stopping zenoh-bridge-remote-api with PID $ZPID'; kill $ZPID; exit 1" SIGINT

  cd "$CURRENT_DIR"
}

stop_daemon() {
  if [ ! -z "$ZPID" ]; then
    echo "Stopping zenoh-bridge-remote-api with PID $ZPID"
    kill "$ZPID"
  fi
}

# run build if needed
if [ ! -d "./dist" ]; then
  yarn build library || exit 1
fi

# Check if DAEMON is the first argument
USE_DAEMON=0
if [ "$1" = "DAEMON" ]; then
  USE_DAEMON=1
  shift
fi

if [ "$1" = "test" ]; then
  cd tests
  deno install || exit 1
  if [ $USE_DAEMON -eq 1 ]; then
    start_daemon
  fi
  yarn start "${@:2}"
  EXIT_CODE=$?
elif [ "$1" = "example" ] && [ "$2" = "deno" ]; then
  cd examples/deno
  deno install || exit 1
  if [ $USE_DAEMON -eq 1 ]; then
    start_daemon
  fi
  yarn start "${@:3}"
  EXIT_CODE=$?
elif [ "$1" = "example" ] && [ "$2" = "browser" ] && [ "$3" = "chat" ]; then
  # there is only "chat" example for now, but later list of examples can be shown
  cd examples/browser/chat
  yarn install || exit 1
  if [ $USE_DAEMON -eq 1 ]; then
    start_daemon
  fi
  yarn start
  EXIT_CODE=$?
elif [ "$1" = "example" ] && [ "$2" = "browser" ] && [ "$3" = "nuxt" ]; then
  cd examples/browser/nuxt
  yarn install || exit 1
  if [ $USE_DAEMON -eq 1 ]; then
    start_daemon
  fi
  yarn dev
  EXIT_CODE=$?
else
  echo
  echo "Available options:"
  echo
  echo "yarn start [DAEMON] test [test-name|ALL] [COVERAGE]"
  echo "yarn start [DAEMON] example deno [example-name]"
  echo "yarn start [DAEMON] example browser [chat|nuxt]"
  echo
  echo "Note: COVERAGE is for tests only, JSON is for benchmarks only"
  echo
fi

stop_daemon

cd "$ORIGINAL_DIR"

# Disable debug command tracing
set +x

exit $EXIT_CODE