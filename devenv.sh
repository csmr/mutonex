#!/bin/bash
# Mutonex Root Orchestrator
if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
  DOCKER_CMD="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
  DOCKER_CMD="docker-compose"
else
  echo "Docker Compose not found."
fi
if [ -n "$DOCKER_CMD" ]; then
  echo "мμτοηεχ δεv εηv ιηιτ"
  source ./scripts/app.config.sh
  ./scripts/init-database-env.sh
  ./scripts/init-dotenv.sh
  mkdir -p "$RUNTIME_DIR" "$WEB_PATH"
  git shortlog -n -s > "$RUNTIME_DIR/CONTRIBS"
  touch "$WEB_PATH/index.html"
  cd infra && $DOCKER_CMD --env-file "$DOTENV_PATH" up
fi
