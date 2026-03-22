#!/bin/bash
source scripts/app.config.sh

models_src="res/entity_geometry"

generate_content() {
  log "Generating dynamic content..."
  deno run -A ./scripts/generate-api-key.js
  deno run -A ./scripts/make-credits.js
  
  if [ ! -d "$models_src" ]; then
    log "Generating models (requires fonts-unifont)..."
    dpkg -l | grep -q fonts-unifont || apt-get install -y fonts-unifont
    deno run -A res/scripts/build_entity_models.ts
  fi
}

bundle_code() {
  log "Bundling TypeScript via esbuild..."
  deno cache npm:esbuild@^0.24.0
  deno task bundle-client-esbuild-module
  [ -f "$RUNTIME_DIR/web.js" ] || { log "Bundle fail"; exit 1; }
}

assemble_assets() {
  local dest_geometry="$RUNTIME_DIR/assets/entity_geometry"
  
  log "Assembling static assets..."
  mkdir -p "$dest_geometry"
  [ -d "$models_src" ] && cp -a "$models_src/." "$dest_geometry/"
  
  cp res/img/favicon.ico "$RUNTIME_DIR/"
  cp webclient/mutonex.html "$RUNTIME_DIR/index.html"
}

distribute_build() {
  local gameserver_static="gameserver/priv/static"
  local entry_file="webclient/main.ts"
  
  log "Linking webclient to gameserver..."
  rm -rf "$gameserver_static"
  ln -sfn ../../dist "$gameserver_static"
  
  if [ "$(id -u)" = "0" ]; then
    local host_uid=$(stat -c '%u' "$entry_file")
    local host_gid=$(stat -c '%g' "$entry_file")
    [ "$host_uid" != "0" ] && chown -R $host_uid:$host_gid "$RUNTIME_DIR"
  fi
}

main() {
  generate_content
  bundle_code
  assemble_assets
  distribute_build
  log "Build and distribution complete."
}

main
