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
  mkdir -p "$RUNTIME_DIR" "gameserver/priv/static"
  git shortlog -n -s > "$RUNTIME_DIR/CONTRIBS"
  touch gameserver/priv/static/index.html
  ./scripts/init-database-env.sh
  ./scripts/init-dotenv.sh
  cd infra && $DOCKER_CMD up
fi
