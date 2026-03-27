#!/bin/bash
set -e

# Configuration
TEST_TIMEOUT="15s"

# Script is located in src/webclient/tests/test.sh
# We want to run deno test from src/webclient/
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
WEBCLIENT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$WEBCLIENT_DIR"

# Check if deno exists
if ! command -v deno &> /dev/null; then
    echo "Error: 'deno' not found. Ensure Deno installed & in PATH."
    exit 1
fi

echo "Run webclient deno tests in $WEBCLIENT_DIR with ${TEST_TIMEOUT} timeout..."

# Run tests with a timeout
timeout "${TEST_TIMEOUT}" deno test
EXIT_CODE=$?

if [ $EXIT_CODE -eq 124 ]; then
    echo "Error: deno test timeout after ${TEST_TIMEOUT}."
    exit 124
fi

exit $EXIT_CODE
