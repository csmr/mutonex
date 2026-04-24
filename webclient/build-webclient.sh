#!/bin/bash
source ../scripts/app.config.sh

models_src="../content/res/entity_geometry"

generate_content() {
  log "Generating content: keys, credits, and geometry."
  deno run -A ./generate-api-key.js
  deno run -A ./make-credits.js
  
  if [ ! -d "$models_src" ]; then
    log "Entity geometry cache empty. Invoking procedural model pipeline and verifying fonts-unifont dependency."
    dpkg -l | grep -q fonts-unifont || apt-get install -y fonts-unifont
    deno run -A ../content/res/scripts/build_entity_models.ts
  fi
}

bundle_code() {
  log "Bundling TypeScript via esbuild..."
  deno cache npm:esbuild@^0.24.0
  deno task bundle-client-esbuild-module
  [ -f "$RUNTIME_DIR/web.js" ] ||
    { log "FAIL: output artifact $RUNTIME_DIR/web.js not found, $0 exit 1"; exit 1; }
}

assemble_assets() {
  local dest_geometry="$RUNTIME_DIR/assets/entity_geometry"
  
  log "Assembling static assets to $RUNTIME_DIR."
  mkdir -p "$dest_geometry"
  [ -d "$models_src" ] && cp -a "$models_src/." "$dest_geometry/"
  
  cp ../content/res/img/favicon.ico "$RUNTIME_DIR/"
  cp mutonex.html "$RUNTIME_DIR/index.html"
}

distribute_build() {
  local distribution_target="../../dist"
  local gameserver_static="../gameserver/priv/static"
  local entry_file="main.ts"
  
  log "Symlinking bundle dir $distribution_target to ${gameserver_static}"
  
  # Symlink distribution bundle to gameserver static root
  rm -rf "$gameserver_static"
  ln -sfn "$distribution_target" "$gameserver_static"
  
  log "Bundle symlink state test: $(ls -ld "$gameserver_static")"
  
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
  log "Client bundle, content gen and distribution assembly complete."
}

main
