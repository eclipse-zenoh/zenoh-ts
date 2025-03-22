#!/bin/sh

SCRIPTDIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
pushd "$SCRIPTDIR/.."

# run build if needed
if [ ! -d "./dist" ]; then
  yarn build || exit 1
fi

if [ "$1" = "test" ]; then
  pushd tests
  yarn install || exit 1
  yarn build || exit 1
  yarn start "${@:2}" || exit 1
  popd
elif [ "$1" = "example" ] && [ "$2" = "deno" ]; then
  pushd examples/deno
  yarn install || exit 1
  yarn start "${@:3}" || exit 1
  popd
elif [ "$1" = "example" ] && [ "$2" = "browser" ] && [ "$3" = "" ]; then
  # there is only "chat" example for now, but later list of examples can be shown
  pushd examples/browser/chat
  yarn install || exit 1
  yarn build || exit 1
  yarn start "${@:4}"
  popd
else
  echo
  echo "Available options:"
  echo
  echo "yarn start test [test-name]"
  echo "yarn start example deno [example-name]"
  echo "yarn start example browser"
  echo
fi

popd