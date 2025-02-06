#!/bin/bash

source ./app.config.sh

# Client bundler, as deno module
deno cache npm:esbuild@^0.24.0
log "test esbuild: $(deno run -A npm:esbuild --version)"
deno task bundle-client-esbuild-module
tf="$RUNTIME_DIR/web.js"
if [ -f $tf ]; then
  log "$(ls -l $tf)" 
else
  log "client bundle fail"
  exit 1
fi
