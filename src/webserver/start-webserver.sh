#!/bin/bash

source scripts/app.config.sh

log "$(date)"
log "$(deno --version)"

# Unique Simtellus API key
# key to simtellus server, key-hash to client
# - simple http API access control for dev container.
deno run --allow-read --allow-write ./scripts/generate-api-key.js

# Add contributor credits to client
deno run --allow-read --allow-write ./scripts/make-credits.js

./scripts/bundle-webclient.sh

# Define and export the single source of truth for the static assets path
export STATIC_ROOT_DIR="/app/dist"

# Run webserver
deno run --allow-net --allow-env --allow-read=$STATIC_ROOT_DIR webserver/app.ts &
WEBSERVER_PID=$!

log "start..."

if [ "$API_KEY_AUTH_ENABLE" = "true" ]; then
  log "API_KEY_AUTH_ENABLE true, skip self test."
else
  sleep 5 

  URL="http://localhost:8888/db-test"
response=$(deno run --allow-net - << EOF
const res = await fetch("$URL");
console.log(res.status);
EOF
)
  if [[ "$response" =~ ^2[0-9][0-9]$ ]]; then
    log "test: 😎 $response"
  else
    log "fail: cannot connect to $URL, status $response"
    kill $WEBSERVER_PID
    exit 1
  fi
fi

trap "kill $WEBSERVER_PID" EXIT
# Keep webserver running
wait $WEBSERVER_PID
