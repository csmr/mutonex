#!/bin/bash
set -e

# Configuration
TEST_TIMEOUT="15s"
CLIENT_PATH="../src/webclient"

# Change to module directory
cd "$(dirname "$0")/${CLIENT_PATH}" || exit 1

# Check if deno exists
if ! command -v deno &> /dev/null; then
    echo "Error: 'deno' not found. Ensure Deno installed & in PATH."
    exit 1
fi

echo "Run deno test in ${CLIENT_PATH} with ${TEST_TIMEOUT} timeout..."

# Run tests with a timeout
timeout "${TEST_TIMEOUT}" deno test
EXIT_CODE=$?

if [ $EXIT_CODE -eq 124 ]; then
    echo "Error: deno test timeout in ${TEST_TIMEOUT}."
    exit 124
fi

exit $EXIT_CODE
