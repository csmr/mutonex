#!/bin/bash

### util functions ###

function log () {
  echo "[ $0 ] $1" # [ scriptname ] arg1
}

### app conf ###

# Set absolute base paths
BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RUNTIME_DIR="$BASE_DIR/dist"
DATA_HOME="$BASE_DIR/infra/data"
