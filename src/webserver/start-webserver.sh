#!/bin/bash

source app.config.sh

log "$(date)"
log "$(deno --version)"

# Unique Simtellus API key
# for server, hash to client
deno run --allow-read --allow-write ./scripts/generate-api-key.js

# Add contributor credits to client
deno run --allow-read --allow-write ./scripts/make-credits.js

./scripts/bundle-webclient.sh

# Run webserver
deno run --allow-net --allow-env webserver/app.ts & 
WEBSERVER_PID=$!

log "start..."
sleep 10

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

trap "kill $WEBSERVER_PID" EXIT
# Keep webserver running
wait $WEBSERVER_PID
