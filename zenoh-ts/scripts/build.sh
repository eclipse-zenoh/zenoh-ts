#!/usr/bin/env bash

ORIGINAL_DIR="$(pwd)"
SCRIPTDIR="$(cd "$(dirname "$0")" >/dev/null 2>&1 && pwd)"
cd "$SCRIPTDIR/.."

# Print usage info
print_usage() {
    echo "Usage: yarn build [component] [subcomponent]"
    echo "Options:"
    echo "  --help     - Show this help message"
    echo ""
    echo "Components (default: library):"
    echo "  library    - Build only library (WASM module and TypeScript)"
    echo "  tests      - Build only tests"
    echo "  examples   - Build only examples"
    echo "    Subcomponents for examples:"
    echo "    deno     - Build only Deno examples"
    echo "    browser  - Build only browser examples"
    echo "  ALL        - Build everything"
    echo ""
    echo "If no component is specified, builds the library by default."
}

# Install common dependencies
install_deps() {
    # install dependencies if needed
    if [ ! -d "./node_modules" ]; then
        yarn install || exit 1
    fi
}

# Build the library (WASM module and TypeScript)
build_library() {
    echo "Building library..."
    # build wasm module
    cd ../zenoh-keyexpr-wasm
    cargo install wasm-pack --locked || exit 1
    wasm-pack build --target bundler --out-dir ../zenoh-ts/src/key_expr || exit 1
    cd "$SCRIPTDIR/.."

    # compile typescript and copy wasm module
    npx tsc || exit 1
    cp ./src/key_expr/*wasm* ./dist/key_expr/
    echo "Library build completed."
}

# Build tests
build_tests() {
    echo "Building tests..."
    cd tests
    # yarn install works too but test coverage works only with deno install
    deno install || exit 1
    yarn verify || exit 1
    cd "$SCRIPTDIR/.."
    echo "Tests build completed."
}

# Build Deno examples
build_examples_deno() {
    echo "Building Deno examples..."
    cd examples/deno
    deno install || exit 1
    yarn verify || exit 1
    cd "$SCRIPTDIR/.."
    echo "Deno examples build completed."
}

# Build browser examples
build_examples_browser() {
    echo "Building browser examples..."
    cd examples/browser/chat
    yarn install || exit 1
    yarn build || exit 1
    cd "$SCRIPTDIR/.."
    
    cd examples/browser/nuxt
    yarn install || exit 1
    yarn build || exit 1
    cd "$SCRIPTDIR/.."
    echo "Browser examples build completed."
}

# Build examples
build_examples() {
    local subcomponent="$1"
    
    if [ -z "$subcomponent" ] || [ "$subcomponent" = "ALL" ]; then
        echo "Building all examples..."
        build_examples_deno
        build_examples_browser
        echo "All examples build completed."
    elif [ "$subcomponent" = "deno" ]; then
        build_examples_deno
    elif [ "$subcomponent" = "browser" ]; then
        build_examples_browser
    else
        echo "Unknown examples subcomponent: $subcomponent"
        print_usage
        exit 1
    fi
}

# Process command line arguments
component="$1"

# Check for help flag
if [ "$component" = "--help" ] || [ "$component" = "-h" ]; then
    print_usage
    exit 0
fi

# If no parameters passed, build library by default
if [ -z "$component" ]; then
    component="library"
fi

subcomponent="$2"

case "${component}" in
    "library")
        install_deps
        build_library
        ;;
    "tests")
        install_deps
        build_library
        build_tests
        ;;
    "examples")
        install_deps
        build_library
        build_examples "$subcomponent"
        ;;
    "ALL")
        install_deps
        build_library
        build_tests
        build_examples
        ;;
    *)
        print_usage
        exit 1
        ;;
esac

cd "$ORIGINAL_DIR"