#!/bin/bash

source ./app.config.sh

### Generate DB .env if no `./data/.env` ###
ENV_PATH=./data/.env.postgres
DATA=./data/postgres

# bash portable random gen
generate_random() {
    local now=$(printf '%(%s)T' -1)  # time
    local b64=$(printf "%s%s%s%s" $SECONDS $BASHPID $RANDOM $now | base64)
    echo "${b64:0:14}"  # bash string slicing, more portable than cut
}

if [ ! -f $ENV_PATH ]; then
    if [ -d $DATA ]; then
        log "Warning: existing $DATA, but no $ENV_PATH"
        read -p "Confirm db credential reset? [y/N] " confirm
        [[ $confirm == [yY] ]] || exit 1
    fi    
    log "Generating $ENV_PATH..."
    cat > $ENV_PATH << EOL
POSTGRES_USER=muto_user_$(generate_random)
POSTGRES_PASSWORD=muto_pass_$(generate_random)
POSTGRES_DB=muto_db_$(generate_random)
EOL
fi 

# Load the environment variables from the generated file.  Crucial!
source "$ENV_PATH"
