#!/bin/bash

### Generates `.env` from template if none ###
### - depends on `.env.template` and `.env.postgres`

source ./scripts/app.config.sh

ENV_PATH="$BASE_DIR/.env"
TPL_PATH="$ENV_PATH.template"
CRED_PATH="$DATA_HOME/.env.postgres"

if [ -f $ENV_PATH ]; then
  log "$ENV_PATH exists, exit."
  exit 0
fi
cat $TPL_PATH > $ENV_PATH 
log "Created $ENV_PATH file."

if [ ! -f $CRED_PATH ]; then
  log "No $CRED_PATH to append."
  exit 1
fi
cat $CRED_PATH >> $ENV_PATH
log "Appended $CRED_PATH to $ENV_PATH."

### To run container as current user
echo "UID=$(id -u)" >> $ENV_PATH
echo "GID=$(id -g)" >> $ENV_PATH
log "Appended current user UID & GID to $ENV_PATH."
