#!/bin/bash

# Set absolute base paths

# Set absolute base paths
DEV_TGT=$(mktemp -d --tmpdir mutonex-dev-XXXXXX)  # mktemp for secure temp dir
PROD_TGT="/opt/mutonex"

# Setup base paths
BASE_DIR="$DEV_TGT/build"
RUNTIME_DIR="$DEV_TGT/build"
DATA_HOME="$DEV_TGT/data"

if [ ! -d "$DEV_TGT" ]; then
  mkdir $DEV_TGT
  mkdir $BASE_DIR
  mkdir $DATA_HOME
fi
