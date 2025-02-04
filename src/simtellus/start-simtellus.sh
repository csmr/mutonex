#!/bin/sh

# Install necessary gems
apk add --no-cache build-base curl

# Function to check if a gem is installed
gem_installed() {
  gem list -i "$1" > /dev/null 2>&1
}

# Install necessary gems if not already installed
if ! gem_installed sinatra || ! gem_installed puma; then
  gem install sinatra json dotenv rack numeric rackup puma
else
  echo "Gems puma & sinatra present, skip gem install" 
fi

# Load environment variables from .env file
set -a
. /app/.env
set +a

# Create the log directory if it doesn't exist, using LOG_PATH
mkdir -p "$(dirname "$LOG_PATH")"

# Run the simulation server in the foreground
ruby /app/server.rb &
SIMTELLUS_PID=$!

# Wait for the server to start (adjust the sleep duration as needed)
sleep 28

# Define the URL for the curl request
URL="http://localhost:${SIMTELLUS_PORT}/planet_state"

# Check the endpoint once
response=$(curl -s -w "%{http_code}" -o /dev/null "$URL")
str="[ $0 server self-test ]"
if [ "$response" -eq 200 ]; then
  echo "$str 😎 $response."
else
  echo "$str FAIL: Endpoint not responding."
  kill $SIMTELLUS_PID
  exit 1
fi

# keep the planet running
wait $SIMTELLUS_PID
