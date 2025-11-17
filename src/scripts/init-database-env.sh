#!/bin/bash

source ./scripts/app.config.sh

### Generate DB .env if no `.env.postgres` ###
ENV_PATH=$DATA_HOME/.env.postgres
PGDATA=$DATA_HOME/postgres

# bash portable random gen
generate_random() {
    local now=$(printf '%(%s)T' -1)  # time
    local b64=$(printf "%s%s%s" $RANDOM $RANDOM $RANDOM | base64)
    echo "${b64:2:16}"  # bash string slicing, more portable than cut
}

if [ ! -f $ENV_PATH ]; then
    if [ -d $PGDATA ]; then
        log "Warning: existing $PGDATA, but no $ENV_PATH"
        read -p "Confirm db credential reset? [y/N] " confirm
        [[ $confirm == [yY] ]] || exit 1
    fi    
    log "Generating $ENV_PATH..."
    cat > $ENV_PATH << EOL
POSTGRES_USER=muto_user_$(generate_random)
POSTGRES_PASSWORD=muto_pass_$(generate_random)
POSTGRES_DB=muto_db_$(generate_random)
EOL

    # Load the generated file
    source "$ENV_PATH"

    # Add DB url
    echo "DATABASE_URL=postgres://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}" >> $ENV_PATH
fi 
