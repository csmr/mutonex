#!/bin/bash

# Set absolute base paths
DEV_TGT=$(mktemp -d --tmpdir mutonex.XXXXXX)  # mktemp for secure temp dir
#PROD_TGT="/opt/mutonex"

BASE_DIR="$DEV_TGT/build"
RUNTIME_DIR="$DEV_TGT/build"
DATA_HOME="$DEV_TGT/data"

# Create directories if they do not exist
mkdir -p "$BASE_DIR"
mkdir -p "$DATA_HOME"
mkdir -p "$PROD_TGT"
#sudo chown $USER:$USER "$PROD_TGT"  # Ensure the user owns the directory

# Install Deno
if ! command -v deno &> /dev/null; then
  curl -fsSL https://deno.land/x/install/install.sh | sh
fi
