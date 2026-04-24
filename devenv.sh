#!/bin/bash
# Mutonex Root Orchestrator
source ./scripts/app.config.sh
mkdir -p "$RUNTIME_DIR" "gameserver/priv"
git shortlog -n -s > "$RUNTIME_DIR/CONTRIBS"
./scripts/init-database-env.sh
./scripts/init-dotenv.sh
cd webclient && bash build-webclient.sh && cd ..
cd infra && docker compose up
