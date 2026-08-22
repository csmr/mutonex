#!/bin/bash
# Mutonex dev-env generator

# runtimes in preference order.
for c in "podman compose" podman-compose "docker compose" docker-compose; do
  $c version >/dev/null 2>&1 && { COMPOSE=($c); break; }
done

[ -n "$COMPOSE" ] || { echo "Podman or Docker not found, exit."; exit 0; }

echo "мμτοηεχ δεv εηv ιηιτ"
source ./scripts/app.config.sh
./scripts/init-database-env.sh
./scripts/init-dotenv.sh
mkdir -p "$RUNTIME_DIR" "$WEB_PATH"
touch "$WEB_PATH/index.html"
cd infra && "${COMPOSE[@]}" --env-file "$DOTENV_PATH" up
