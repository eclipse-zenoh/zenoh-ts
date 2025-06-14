#!/usr/bin/env bash

ORIGINAL_DIR="$(pwd)"
SCRIPTDIR="$(cd "$(dirname "$0")" >/dev/null 2>&1 && pwd)"
cd "$SCRIPTDIR/.."

# Function to run benchmarks with JSON output
run_benchmark_json() {
  local bench_files="$1"
  local output_prefix="$2"
  
  # Create benchmark_results directory if it doesn't exist
  mkdir -p benchmark_results
  
  # Generate timestamp for result files
  TIMESTAMP=$(date -u +"%Y%m%d_%H%M%S")
  
  # Run benchmarks with JSON output
  echo "=== Running benchmarks with machine-readable JSON output ==="
  deno bench --json -A $bench_files > "benchmark_results/${output_prefix}_${TIMESTAMP}.json" 2>&1
  local exit_code=$?
  
  # Display file location
  if [ -f "benchmark_results/${output_prefix}_${TIMESTAMP}.json" ]; then
    echo "Machine-readable results saved to: benchmark_results/${output_prefix}_${TIMESTAMP}.json"
  fi
  
  return $exit_code
}

if [ "$1" = "" ]; then
  echo
  echo "Arguments: test_name|ALL|TESTS|BENCH [COVERAGE|JSON]"
  echo "  test_name: name of the test to run"
  echo "  ALL: run all tests and benchmarks"
  echo "  TESTS: run only tests (no benchmarks)"
  echo "  BENCH: run only benchmarks (no tests)"
  echo "  COVERAGE: generate coverage report (tests only)"
  echo "  JSON: generate machine-readable JSON output (benchmarks only)"
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
  elif [ "$2" = "JSON" ]; then
    JSON_OUTPUT=true
  fi

  if [ "$1" = "ALL" ]; then
    deno test -A $COVERAGE_OPTS src/*.ts
    EXIT_CODE=$?
    if [ $EXIT_CODE -eq 0 ]; then
      deno bench -A src/bench/*.ts
      EXIT_CODE=$?
    fi
  elif [ "$1" = "TESTS" ]; then
    deno test -A $COVERAGE_OPTS src/*.ts
    EXIT_CODE=$?
  elif [ "$1" = "BENCH" ]; then
    if [ "$JSON_OUTPUT" = true ]; then
      run_benchmark_json "src/bench/*.ts" "benchmark_results"
      EXIT_CODE=$?
    else
      # Run benchmarks with human-readable output (default)
      echo "=== Running benchmarks with human-readable output ==="
      deno bench -A src/bench/*.ts
      EXIT_CODE=$?
    fi
  else
    TEST_PATH="src/$1.ts"
    if [ -f "$TEST_PATH" ]; then
      if [[ "$TEST_PATH" == *"/bench/"* ]]; then
        BENCH_NAME=$(basename "$1")
        
        if [ "$JSON_OUTPUT" = true ]; then
          run_benchmark_json "$TEST_PATH" "benchmark_${BENCH_NAME}"
          EXIT_CODE=$?
        else
          # Run benchmark with human-readable output
          echo "=== Running benchmark: $BENCH_NAME ==="
          deno bench -A "$TEST_PATH"
          EXIT_CODE=$?
        fi
      else
        deno test -A $COVERAGE_OPTS "$TEST_PATH"
        EXIT_CODE=$?
      fi
    else
      echo "Test file not found: $TEST_PATH"
      EXIT_CODE=1
    fi
  fi
fi

cd "$ORIGINAL_DIR"
exit ${EXIT_CODE:-0}