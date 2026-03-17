#!/bin/bash
set -e

# Change to the src directory where the .env file is located
cd "$(dirname "$0")/../src" || exit 1

# Export variables from the .env file if it exists
if [ -f .env ]; then
  # Read line by line, ignoring comments and empty lines
  while IFS= read -r line || [ -n "$line" ]; do
    if [[ "$line" != *"#"* ]] && [[ -n "$line" ]]; then
      # Extract key and value separately to avoid 'export readonly' errors
      key="${line%%=*}"
      value="${line#*=}"
      
      # Skip readonly properties like UID
      if [ "$key" = "UID" ]; then
        continue
      fi
      
      export "$key=$value"
    fi
  done < <(grep -v '^#' .env)
  
  echo "Loaded environment variables from src/.env"
else
  echo "Warning: src/.env file not found."
fi

# Run the elixir mix tests
cd gameserver || exit 1

# Check if mix exists
if ! command -v mix &> /dev/null; then
    echo "Error: 'mix' command could not be found. Please ensure Elixir is installed and in your PATH."
    exit 1
fi

echo "Running mix test in src/gameserver with 150s timeout..."

# Run tests with a 150-second timeout
timeout 150s mix test
EXIT_CODE=$?

if [ $EXIT_CODE -eq 124 ]; then
    echo "Error: mix test timed out after 150 seconds."
    exit 124
fi

exit $EXIT_CODE
