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

# App path, logging & build conf
source ./scripts/app.config.sh

# Contributors
mkdir -p "$RUNTIME_DIR"
git shortlog -n -s > "$RUNTIME_DIR/CONTRIBS"

# Unique DB credentials .env.postgres
./scripts/init-database-env.sh

# Create .env if it doesn't exist
./scripts/init-dotenv.sh

docker-compose up
