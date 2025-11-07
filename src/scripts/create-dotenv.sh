#!/bin/bash

source ./scripts/app.config.sh

# if no .env, create from template
ENV_PATH="$BASE_DIR/.env"
TPL_PATH="$ENV_PATH.template"

if [ ! -f $ENV_PATH ]; then
  log "Creating $ENV_PATH file."
  cat $TPL_PATH > $ENV_PATH
fi

source "$ENV_PATH"
