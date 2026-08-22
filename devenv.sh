#!/bin/bash
# Mutonex dev-env generator

# runtimes in preference order.
COMPOSERS=(
  "podman compose"
  "podman-compose"
  "docker compose"
  "docker-compose"
)

COMPOSE=()
for c in "${COMPOSERS[@]}"; do
  $c version >/dev/null 2>&1 && COMPOSE=($c) && break
done

[ -n "$COMPOSE" ] || {
  echo "Podman or Docker cont compose not found, exit."
  exit 0
}

echo "мμτοηεχ δεv εηv ιηιτ"
source ./scripts/app.config.sh
./scripts/init-database-env.sh
./scripts/init-dotenv.sh
mkdir -p "$RUNTIME_DIR" "$WEB_PATH"
touch "$WEB_PATH/index.html"
cd infra && "${COMPOSE[@]}" --env-file "$DOTENV_PATH" up
