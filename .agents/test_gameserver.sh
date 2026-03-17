#!/bin/bash
set -e

# Configuration
TEST_TIMEOUT="150s"
ENV_PATH="../src/.env"
SERVER_PATH="../src/gameserver"

# Change to module directory
cd "$(dirname "$0")/${SERVER_PATH}" || exit 1

# Export variables from the .env file if it exists, skipping readonly UID/GID
if [ -f "${ENV_PATH}" ]; then
  set -a
  source <(grep -v -E '^(UID|GID)=' "${ENV_PATH}")
  set +a
  echo "Loaded environment variables from ${ENV_PATH}"
else
  echo "Warning: ${ENV_PATH} file not found."
fi

# Check if mix exists
if ! command -v mix &> /dev/null; then
    echo "Error: 'mix' command could not be found. Please ensure Elixir is installed and in your PATH."
    exit 1
fi

echo "Running mix test in src/gameserver with ${TEST_TIMEOUT} timeout..."

# Run tests with a timeout
timeout "${TEST_TIMEOUT}" mix test
EXIT_CODE=$?

if [ $EXIT_CODE -eq 124 ]; then
    echo "Error: mix test timed out after ${TEST_TIMEOUT}."
    exit 124
fi

exit $EXIT_CODE
