#!/bin/bash

ORIGINAL_DIR="$(pwd)"
SCRIPTDIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$SCRIPTDIR/.."

# run build if needed
if [ ! -d "./dist" ]; then
  yarn build || exit 1
fi

if [ "$1" = "test" ]; then
  cd tests
  yarn install || exit 1
  yarn build || exit 1
  yarn start "${@:2}" || exit 1
elif [ "$1" = "example" ] && [ "$2" = "deno" ]; then
  cd examples/deno
  yarn install || exit 1
  yarn start "${@:3}" || exit 1
elif [ "$1" = "example" ] && [ "$2" = "browser" ] && [ "$3" = "" ]; then
  # there is only "chat" example for now, but later list of examples can be shown
  cd examples/browser/chat
  yarn install || exit 1
  yarn build || exit 1
  yarn start "${@:4}"
else
  echo
  echo "Available options:"
  echo
  echo "yarn start test [test-name]"
  echo "yarn start example deno [example-name]"
  echo "yarn start example browser"
  echo
fi

cd "$ORIGINAL_DIR"