#!/bin/bash

### util functions ###

function log () {
  echo "[ $0 ] $1" # [ scriptname ] arg1
}

### app conf ###

# Set absolute base paths
BASE_DIR="$(realpath .)"
RUNTIME_DIR="$BASE_DIR/dist"
DATA_HOME="$BASE_DIR/data" 
