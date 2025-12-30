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

log "Webclient bundle complete."
log "Sleeping infinitely to keep builder container alive..."
sleep infinity
