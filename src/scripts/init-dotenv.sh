#!/bin/bash

### Generates .env from template if missing ###

source ./scripts/app.config.sh

ENV_PATH="$BASE_DIR/.env"
TPL_PATH="$ENV_PATH.template"
CRED_PATH="$DATA_HOME/.env.postgres"

[ -f $ENV_PATH ] && log "$ENV_PATH exists." && exit 0

cat $TPL_PATH > $ENV_PATH
cat $CRED_PATH >> $ENV_PATH

echo "UID=$(id -u)" >> $ENV_PATH
echo "GID=$(id -g)" >> $ENV_PATH

# Generate random signing salt
echo "PHX_SIGNING_SALT=$(head -c 48 /dev/urandom | base64)" >> $ENV_PATH

log "Created $ENV_PATH with credentials and salt."
