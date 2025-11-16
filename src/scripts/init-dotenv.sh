#!/bin/bash

source ./scripts/app.config.sh

### Generate .env if no `./src/.env` ###
ENV_PATH="$BASE_DIR/.env"
TPL_PATH="$ENV_PATH.template"
CRED_PATH="$DATA_HOME/.env.postgres"

if [ ! -f $ENV_PATH ]; then
  log "Creating $ENV_PATH file."
  cat $TPL_PATH > $ENV_PATH 
fi

if [ -f $CRED_PATH ]; then
  log "Appending $CRED_PATH to $ENV_PATH."
  cat $CRED_PATH >> $ENV_PATH
fi

source "$ENV_PATH"
