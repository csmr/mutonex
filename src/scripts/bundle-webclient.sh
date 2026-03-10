#!/bin/bash

source ./scripts/app.config.sh

# Client bundler, as deno module
deno cache npm:esbuild@^0.24.0
log "test esbuild: $(deno run -A npm:esbuild --version)"
deno task bundle-client-esbuild-module
tf="$RUNTIME_DIR/web.js"
if [ -f $tf ]; then
  log "$(ls -l $tf)" 
  mkdir -p "$RUNTIME_DIR/assets"
  cp -a webclient/assets/. "$RUNTIME_DIR/assets/"
  
  # Clean up stale .json models from previous builds
  rm -f "$RUNTIME_DIR/assets/"*.json
  
  # Copy generated model assets if they exist
  if [ -d "res/entity_geometry" ]; then
    mkdir -p "$RUNTIME_DIR/assets/entity_geometry"
    cp -a res/entity_geometry/. "$RUNTIME_DIR/assets/entity_geometry/"
  fi
  cp res/img/favicon.ico "$RUNTIME_DIR/"
  # Copy entry point
  cp webclient/mutonex.html "$RUNTIME_DIR/index.html"

  # Sync to gameserver to ensure Elixir can serve these assets
  mkdir -p gameserver/priv/static
  cp -a "$RUNTIME_DIR/." gameserver/priv/static/

  # Fix permissions if running as root (e.g. inside Docker compose)
  if [ "$(id -u)" = "0" ]; then
    HOST_UID=$(stat -c '%u' webclient/main.ts)
    HOST_GID=$(stat -c '%g' webclient/main.ts)
    if [ "$HOST_UID" != "0" ]; then
      chown -R $HOST_UID:$HOST_GID "$RUNTIME_DIR"
      log "Restored $RUNTIME_DIR ownership to host user ($HOST_UID:$HOST_GID)"
    fi
  fi
else
  log "client bundle fail"
  exit 1
fi
