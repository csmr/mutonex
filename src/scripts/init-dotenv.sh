#!/bin/bash

source ./scripts/app.config.sh

### Generate .env if no `./src/.env` ###
ENV_PATH="$BASE_DIR/.env"
TPL_PATH="$ENV_PATH.template"
CRED_PATH="$DATA_HOME/.env.postgres"

if [ -f $ENV_PATH ]; then
  log "$ENV_PATH exists, exit."
  exit 1
fi
cat $TPL_PATH > $ENV_PATH 
log "Created $ENV_PATH file."

if [ ! -f $CRED_PATH ]; then
  log "No $CRED_PATH to append."
  exit
fi
cat $CRED_PATH >> $ENV_PATH
log "Appended $CRED_PATH to $ENV_PATH."
