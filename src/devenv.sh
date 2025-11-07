#!/bin/bash

# Dev-environment init script
# Dependencies bash, docker-compose and git.

if ! command -v docker-compose >/dev/null; then
  echo "no docker-compose, on debian try:"
  echo "sudo apt install docker-compose"
  echo "sudo usermod -aG docker [username]"
  echo "log out and back in, retry"
  exit 1
fi

echo "мμτοηεχ δεv εηv ιηιτ"

# Create .env if it doesn't exist
./scripts/create-dotenv.sh

source ./.env

# App path, logging & build conf
source ./scripts/app.config.sh

# Create directories if they do not exist
mkdir -p "$RUNTIME_DIR"
mkdir -p "$DATA_HOME"

# Contributors
git shortlog -n -s > "$RUNTIME_DIR/CONTRIBS"

# Unique DB credentials
./scripts/init-database-env.sh

# Postgres DB .env & simtellus .env
# - needed by compose.yaml 
set -a
. ./data/.env.postgres
. ./.env
. ./simtellus/.env
set +a

docker-compose up
