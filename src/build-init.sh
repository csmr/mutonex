#!/bin/bash

# Set absolute base paths
DEV_TGT=$(readlink -f ../temp)
#PROD_TGT=$(readlink -f ~/zecurfoez)

# Setup base paths
BASE_DIR="$DEV_TGT/build"
RUNTIME_DIR="$DEV_TGT/build"
DATA_HOME="$DEV_TGT/data"

if [ ! -d "$DEV_TGT" ]; then
  mkdir $DEV_TGT
  mkdir $BASE_DIR
  mkdir $DATA_HOME
fi