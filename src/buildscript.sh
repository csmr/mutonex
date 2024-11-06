#!/bin/bash

# Set absolute base paths
BASE_DIR="$(realpath .)"
RUNTIME_DIR="$BASE_DIR/dist"
DATA_HOME="$BASE_DIR/data"

# Create directories if they do not exist
mkdir -p "$RUNTIME_DIR"
mkdir -p "$DATA_HOME"

# Add contributor credits to client
deno run --allow-read --allow-write ./scripts/make-credits.js

# Install project deps & bundle client
deno install
deno task bundle-client

# Run web server
deno run --allow-net --allow-env server/app.ts
