#!/bin/bash

source scripts/app.config.sh

log "Starting Webclient Builder..."
log "$(date)"
log "Deno version: $(deno --version)"

# Unique Simtellus API key
# key to simtellus server, key-hash to client
# - simple http API access control for dev container.
log "Generating API Key..."
deno run --allow-read --allow-write ./scripts/generate-api-key.js

# Add contributor credits to client
log "Generating Credits..."
deno run --allow-read --allow-write ./scripts/make-credits.js

log "Bundling Webclient..."
./scripts/bundle-webclient.sh

log "Webclient bundle complete."
log "Sleeping infinitely to keep builder container alive..."
sleep infinity
