#!/bin/sh

# install deps
apk add --no-cache build-base curl

# is a gem is installed?
gem_installed() {
  gem list -i "$1" > /dev/null 2>&1
}

# Install gem deps if not installed
if ! gem_installed sinatra || ! gem_installed puma; then
  gem install sinatra json dotenv rack numeric rackup puma
else
  echo "Gems puma & sinatra present, skip gem install" 
fi

# Ensure we have dot-env
if [ -f ./app/.env ]; then
  cp ./app/.env.template ./app/.env
fi

# Load environment variables from .env file
set -a
. /app/.env
set +a

# Create the log directory if it doesn't exist, using LOG_PATH
mkdir -p "$(dirname "$LOG_PATH")"

# Run server in the background
ruby /app/server.rb &
SIMTELLUS_PID=$!

# Define the URL for the curl request
URL="http://localhost:${SIMTELLUS_PORT}/planet_state"
str="[ $0 test server ]"
# Check if API_KEY_AUTH_ENABLE is set to 'true'
if [ "$API_KEY_AUTH_ENABLE" = "true" ]; then
  echo "$str API_KEY_AUTH_ENABLE true, self-test skipped."
else
  # Wait for the server to start
  sleep 28

  # Perform the curl request to test the endpoint
  response=$(curl -s -w "%{http_code}" -o /dev/null "$URL")

  if [ "$response" -eq 200 ]; then
    echo "$str 😎 $response."
  else
    echo "$str FAIL: Endpoint not responding."
    kill $SIMTELLUS_PID
    exit 1
  fi
fi

# end upon signal
trap 'kill $SIMTELLUS_PID' TERM INT

# keep the planet running
wait $SIMTELLUS_PID
