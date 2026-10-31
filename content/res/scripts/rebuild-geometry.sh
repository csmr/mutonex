#!/bin/bash
# Utility script to manually trigger a full regeneration of all 3D entity model JSON assets.

source scripts/app.config.sh

if [ -d "content/res/entity_geometry" ]; then
    log "Cleaning existing model cache..."
    rm -rf content/res/entity_geometry/*
    mkdir -p content/res/entity_geometry
fi

if ! dpkg -l | grep -q fonts-unifont; then
    log "Installing required fonts-unifont dependency..."
    apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y fonts-unifont
fi

log "Running Entity Model Builder..."
deno run --allow-read --allow-write --allow-net="deno.land" \
    content/res/scripts/build_entity_models.ts
log "Rebuild complete."
