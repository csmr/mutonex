#!/bin/bash
set -e

# Configuration
TEST_TIMEOUT="15s"

# Script is located in webclient/tests/test.sh
# We want to run deno test from webclient/
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
WEBCLIENT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$WEBCLIENT_DIR"

echo "INFO: Playwright E2E: bash webclient/scripts/test_e2e.sh"

if [ -f "../scripts/format_doc.sh" ]; then
    bash ../scripts/format_doc.sh "$@" || true
fi

# Check if deno exists
if ! command -v deno &> /dev/null; then
    echo "Error: 'deno' not found."
    exit 1
fi

echo "Run webclient deno tests in $WEBCLIENT_DIR..."

# Run tests with a timeout
timeout "${TEST_TIMEOUT}" deno test --no-check
EXIT_CODE=$?

if [ $EXIT_CODE -eq 124 ]; then
    echo "Error: deno test timeout after ${TEST_TIMEOUT}."
    exit 124
fi

exit $EXIT_CODE
