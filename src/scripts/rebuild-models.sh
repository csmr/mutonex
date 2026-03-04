#!/bin/bash
# Utility script to manually trigger a full regeneration of all 3D entity model JSON assets.

source scripts/app.config.sh

if [ -d "res/models" ]; then
    log "Cleaning existing model cache..."
    rm -rf res/models/*
    mkdir -p res/models
fi

log "Running Entity Model Builder..."
deno run -A scripts/build_entity_models.ts
log "Rebuild complete."
