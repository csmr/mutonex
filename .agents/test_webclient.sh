#!/bin/bash
set -e

# Configuration
TEST_TIMEOUT="150s"
CLIENT_PATH="../src/webclient"

# Change to module directory
cd "$(dirname "$0")/${CLIENT_PATH}" || exit 1

# Check if deno exists
if ! command -v deno &> /dev/null; then
    echo "Error: 'deno' command could not be found. Please ensure Deno is installed and in your PATH."
    exit 1
fi

echo "Running deno test in src/webclient with ${TEST_TIMEOUT} timeout..."

# Run tests with a timeout
timeout "${TEST_TIMEOUT}" deno test
EXIT_CODE=$?

if [ $EXIT_CODE -eq 124 ]; then
    echo "Error: deno test timed out after ${TEST_TIMEOUT}."
    exit 124
fi

exit $EXIT_CODE
