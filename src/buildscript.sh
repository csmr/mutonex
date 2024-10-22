#!/bin/bash

# Set absolute base paths
DEV_TGT=$(mktemp -d --tmpdir mutonex.XXXXXX)  # mktemp for secure temp dir
#PROD_TGT="/opt/mutonex"

BASE_DIR="$(realpath .)"
RUNTIME_DIR="$DEV_TGT/build"
DATA_HOME="$DEV_TGT/data"

# Create directories if they do not exist
mkdir -p "$RUNTIME_DIR"
mkdir -p "$DATA_HOME"
#mkdir -p "$PROD_TGT"
#sudo chown $USER:$USER "$PROD_TGT"  # Ensure the user owns the directory

# Install Deno
if ! command -v deno &> /dev/null; then
  echo "buildscript: deno.land installer download"
  curl -fsSL https://deno.land/x/install/install.sh | sh
  echo "adding ~/.deno/bin to PATH"
  export PATH="~/.deno/bin:$PATH" 
fi

# esbuild the client-side app
#deno task build
# --allow-read npm:esbuild

# Copy built files to the runtime directory
# cp "$BASE_DIR/client/mutonex.html" "$RUNTIME_DIR/client/"

# Set up the server
# deno cache "$BASE_DIR/server/deps.ts"
