#!/bin/bash
# Mutonex Root Orchestrator
source ./scripts/app.config.sh
mkdir -p "$RUNTIME_DIR" "gameserver/priv/static"
git shortlog -n -s > "$RUNTIME_DIR/CONTRIBS"
touch gameserver/priv/static/index.html
./scripts/init-database-env.sh
./scripts/init-dotenv.sh
cd infra && docker compose up
