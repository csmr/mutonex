#!/bin/bash

# This script makes dev env
# - deps bash, git and docker-compose

echo "мμτοηεχ δεv εηv ιηιτ"

# App path, logging & build conf
source ./app.config.sh

# Dependencies 
if ! command -v docker-compose >/dev/null; then
  echo "no docker-compose, on debian try:"
  echo "sudo apt install docker-compose"
  echo "sudo usermod -aG docker [username]"
  echo "log out and back in, retry"
  exit 1fi

# Create directories if they do not exist
mkdir -p "$RUNTIME_DIR"
mkdir -p "$DATA_HOME"

# Unique DB credintials
./scripts/init-database-env.sh

[ -d dist ] || mkdir dist
git shortlog -n -s > "$RUNTIME_DIR/CONTRIBS"

# Postgres DB .env & simtellus .env
# - needed by docker-compose.yml 
set -a
. ./data/.env.postgres
. ./simtellus/.env
set +a

docker-compose up
