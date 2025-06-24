#!/usr/bin/env bash

ORIGINAL_DIR="$(pwd)"
SCRIPTDIR="$(cd "$(dirname "$0")" >/dev/null 2>&1 && pwd)"
cd "$SCRIPTDIR/.."

if [ "$1" = "" ]; then
  echo
  echo "Arguments: test_name|ALL [COVERAGE]"
  echo "  test_name: name of the test to run or ALL to run all tests"
  echo "  COVERAGE: generate coverage report"
  echo
  echo "Available tests:"
  ls src/*.ts | sed -e "s/src\///" -e "s/\.ts//" | sort
  echo
  echo "Available performance tests:"
  ls src/bench/*.ts | sed -e "s/src\///" -e "s/\.ts//" | sort
  echo
else
  EXIT_CODE=0
  COVERAGE_OPTS=""
  JSON_OUTPUT=false
  
  if [ "$2" = "COVERAGE" ]; then
    COVERAGE_OPTS="--coverage=coverage_profile"
  fi

  if [ "$1" = "ALL" ]; then
    deno test -A $COVERAGE_OPTS src/*.ts
    EXIT_CODE=$?
    if [ $EXIT_CODE -eq 0 ]; then
      deno test -A $COVERAGE_OPTS src/bench/*.ts
    fi
  else
    TEST_PATH="src/$1.ts"
    if [ -f "$TEST_PATH" ]; then
      if [[ "$TEST_PATH" == *"/bench/"* ]]; then
        deno bench -A $COVERAGE_OPTS "$TEST_PATH"
      else
        deno test -A $COVERAGE_OPTS "$TEST_PATH"
      fi
      EXIT_CODE=$?
    else
      echo "Test file not found: $TEST_PATH"
      EXIT_CODE=1
    fi
  fi
fi

cd "$ORIGINAL_DIR"
exit ${EXIT_CODE:-0}