#!/bin/bash

source scripts/app.config.sh

log "Starting Webclient Builder..."
log "$(date)"
log "Deno version: $(deno --version)"

# Unique API key
# key to gameserver, key-hash to client
# - simple http API access control for dev container.
log "Generating API Key..."
deno run --allow-read --allow-write ./scripts/generate-api-key.js

# Add contributor credits to client
log "Generating Credits..."
deno run --allow-read --allow-write ./scripts/make-credits.js

# Ensure model cache is populated (lazy generation)
if [ ! -d "res/models" ] || [ -z "$(ls -A res/models)" ]; then
    log "Model assets missing. Auto-generating..."
    deno run -A scripts/build_entity_models.ts
else
    log "Model assets found. Skipping auto-generation."
fi

log "Bundling Webclient..."
./scripts/bundle-webclient.sh

log "Webclient bundle complete."
log "Sleeping infinitely to keep builder container alive..."
sleep infinity
