#!/bin/bash

# Utility script to manually trigger a full regeneration of all 3D geometry JSON assets.
# This cleans out the existing cache and reruns the Deno generator.

source ./scripts/app.config.sh

log "Preparing to rebuild 3D Font Geometry Assets..."

if [ -d "res/geometry" ]; then
    log "Cleaning existing geometry cache..."
    rm -rf res/geometry/*
else
    log "Geometry directory not found, creating it..."
    mkdir -p res/geometry
fi

log "Running generator pipeline..."
deno run -A scripts/generate_geometry.ts

log "Geometry rebuilding complete."
log "You must still run './scripts/bundle-webclient.sh' to copy the new files into the active Webclient distribution payload."
