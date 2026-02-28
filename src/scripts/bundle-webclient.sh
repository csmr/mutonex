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
  # Merge generated geometry assets if they exist
  if [ -d "res/geometry" ]; then
    cp -a res/geometry/. "$RUNTIME_DIR/assets/"
  fi
  cp webclient/assets/favicon.ico "$RUNTIME_DIR/"
  # Copy entry point
  cp webclient/mutonex.html "$RUNTIME_DIR/index.html"

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
