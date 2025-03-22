#!/bin/bash

SCRIPTDIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
pushd "$SCRIPTDIR/.."

# if no arugments are passed, show available examples:
# with this command
# ls src/*.ts | sed -e \"s/src\\///\" -e \"s/\\.ts//\"'"
# otherwise run the example
# with command
# deno run -A --no-prompt src/$0.ts $@

if [ "$1" = "" ]; then
  echo
  echo "Available options:"
  echo
  ls src/*.ts | sed -e "s/src\///" -e "s/\.ts//"
  echo
else
  deno run -A --no-prompt src/$1.ts "${@:2}"
fi



popd