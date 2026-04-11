#!/bin/bash

# monorepo_transformer_20260329.sh
# Restructures Mutonex into a flat, top-level monorepo structure.

# 1. Immutable Truth
BASE_COMMIT="cea3b25c0c80ada2ab99dc7982a46907fc49373f"

# 2. Configuration
SCRIPT_NAME=$(basename "$0")
SOURCE_DIR="src"
TARGET_GAMESERVER="gameserver"
TARGET_WEBCLIENT="webclient"
TARGET_CONTENT="content"
TARGET_INFRA="infra"
TARGET_SCRIPTS="scripts"

# 3. Utilities
log() {
    echo "[$SCRIPT_NAME] $1"
}

# If exists, move source to target
safe_move() {
    local src="$1"
    local dst="$2"
    if [ -e "$src" ]; then
        log "Moving $src to $dst"
        mv "$src" "$dst"
    fi
}

# Portable sed wrapper
apply_sed() {
    local pattern="$1"
    local file="$2"
    [ -f "$file" ] && {
        sed -i "$pattern" "$file" 2>/dev/null || \
        sed -i '' "$pattern" "$file"
    }
}

check_environment() {
    if ! git merge-base --is-ancestor "$BASE_COMMIT" HEAD; then
        log "ERROR: Script must run from branch with $BASE_COMMIT."
        exit 1
    fi
    [ ! -d "$SOURCE_DIR" ] && {
        log "ERROR: Source directory '$SOURCE_DIR' not found."
        exit 1
    }
}

# 4. Phase 1: Basic Structure Initialization
initialize_structure() {
    log "Initializing top-level directories..."
    mkdir -p "$TARGET_GAMESERVER" "$TARGET_WEBCLIENT" "$TARGET_CONTENT" \
             "$TARGET_INFRA" "$TARGET_SCRIPTS"
}

# 5. Phase 2: Webclient and Dependencies
transform_webclient() {
    log "Transforming Webclient and Dependencies..."

    safe_move "$SOURCE_DIR/res" "$TARGET_CONTENT/"
    safe_move "$SOURCE_DIR/ruleset" "$TARGET_CONTENT/"

    if [ -d "$SOURCE_DIR/webclient" ]; then
        cp -a "$SOURCE_DIR/webclient/." "$TARGET_WEBCLIENT/"
        rm -rf "$SOURCE_DIR/webclient"
    fi

    safe_move "$SOURCE_DIR/deno.json" "$TARGET_WEBCLIENT/"
    safe_move "$SOURCE_DIR/deno.lock" "$TARGET_WEBCLIENT/"

    for f in build-webclient.sh generate-api-key.js \
             hash-utils.ts make-credits.js; do
        safe_move "$SOURCE_DIR/scripts/$f" "$TARGET_WEBCLIENT/"
    done

    local deno_cfg="$TARGET_WEBCLIENT/deno.json"
    apply_sed 's|webclient/main.ts|main.ts|g' "$deno_cfg"
    apply_sed 's|./dist/web.js|../dist/web.js|g' "$deno_cfg"

    local build_sh="$TARGET_WEBCLIENT/build-webclient.sh"
    apply_sed "s|source scripts/|source ../$TARGET_SCRIPTS/|g" "$build_sh"
    apply_sed "s|models_src=\"res/|models_src=\"../$TARGET_CONTENT/res/|g" "$build_sh"
    apply_sed "s|deno run -A ./scripts/|deno run -A ./|g" "$build_sh"
    apply_sed "s|deno run -A res/scripts/|deno run -A ../$TARGET_CONTENT/res/scripts/|g" "$build_sh"
    apply_sed "s|cp res/img/|cp ../$TARGET_CONTENT/res/img/|g" "$build_sh"
    apply_sed "s|webclient/|./|g" "$build_sh"
    apply_sed "s|gameserver/priv/static|../$TARGET_GAMESERVER/priv/static|g" "$build_sh"

    local key_js="$TARGET_WEBCLIENT/generate-api-key.js"
    apply_sed "s|join(Deno.cwd(), \"webclient\",|join(Deno.cwd(),|g" "$key_js"
    apply_sed "s|join(Deno.cwd(), \".env\")|join(Deno.cwd(), \"..\", \".env\")|g" "$key_js"
}

# 6. Phase 3: Gameserver, Infra, and Finalizing
transform_platform_and_infra() {
    log "Transforming Gameserver and Infrastructure..."

    if [ -d "$SOURCE_DIR/gameserver" ]; then
        cp -a "$SOURCE_DIR/gameserver/." "$TARGET_GAMESERVER/"
        rm -rf "$SOURCE_DIR/gameserver"
    fi

    if [ -d "$SOURCE_DIR/conf" ]; then
        mkdir -p "$TARGET_INFRA/conf"
        cp -a "$SOURCE_DIR/conf/." "$TARGET_INFRA/conf/"
        rm -rf "$SOURCE_DIR/conf"
    fi
    if [ -d "$SOURCE_DIR/data" ]; then
        mkdir -p "$TARGET_INFRA/data"
        cp -a "$SOURCE_DIR/data/." "$TARGET_INFRA/data/"
        rm -rf "$SOURCE_DIR/data"
    fi

    safe_move "$SOURCE_DIR/compose.yaml" "$TARGET_INFRA/"

    for f in init-database-env.sh init-dotenv.sh test_endpoints.sh app.config.sh; do
        safe_move "$SOURCE_DIR/scripts/$f" "$TARGET_SCRIPTS/"
    done

    safe_move "$SOURCE_DIR/CHANGELOG.md" "./"
    safe_move "$SOURCE_DIR/README.md" "./README.src.md"
    safe_move "$SOURCE_DIR/.env.template" "./"

    if [ -d "$SOURCE_DIR/dist" ]; then
        mkdir -p dist
        cp -a "$SOURCE_DIR/dist/." "./dist/"
        rm -rf "$SOURCE_DIR/dist"
    fi

    safe_move "$SOURCE_DIR/.env" "./"

    cp "$SOURCE_DIR/devenv.sh" "./mutonex.sh"
    chmod +x "./mutonex.sh"

    apply_sed "s|source ./scripts/|source ./$TARGET_SCRIPTS/|g" "./mutonex.sh"
    apply_sed "s|./scripts/|./$TARGET_SCRIPTS/|g" "./mutonex.sh"
    apply_sed "s|docker-compose up|cd $TARGET_INFRA \&\& docker-compose up|g" "./mutonex.sh"

    local compose_yml="$TARGET_INFRA/compose.yaml"
    apply_sed 's| \.:/app| ../:/app|g' "$compose_yml"
    apply_sed 's| \./dist:| ../dist:|g' "$compose_yml"
    apply_sed 's|\./scripts/build-webclient.sh|../webclient/build-webclient.sh|g' "$compose_yml"
    apply_sed 's| \./gameserver:| ../gameserver:|g' "$compose_yml"
    apply_sed 's| \./res:| ../content/res:|g' "$compose_yml"
    apply_sed 's| - \./\.env| - ../.env|g' "$compose_yml"

    local app_cfg="$TARGET_SCRIPTS/app.config.sh"
    apply_sed "s|BASE_DIR=\"\$(realpath \.)\"|BASE_DIR=\"\$(realpath ..)\"|g" "$app_cfg"
    apply_sed "s|DATA_HOME=\"\$BASE_DIR/data\"|DATA_HOME=\"\$BASE_DIR/$TARGET_INFRA/data\"|g" "$app_cfg"

    rm -rf "$SOURCE_DIR"
}

# 7. Verification
verify_result() {
    log "Verifying transformation..."
    (
        cd "$TARGET_INFRA"
        [ -f ../.env ] || touch ../.env
        [ -f data/.env.postgres ] || touch data/.env.postgres
        [ -f data/conf/postgresql.conf ] || touch data/conf/postgresql.conf
        [ -f data/conf/pg_hba.conf ] || touch data/conf/pg_hba.conf
        [ -f conf/nginx.conf ] || touch conf/nginx.conf

        if docker compose config > /dev/null 2>&1; then
            log "Docker Compose configuration is VALID."
        else
            log "ERROR: Docker Compose configuration is INVALID."
            exit 1
        fi
    ) || exit 1
    log "Transformation verified successfully."
}

# 8. Execution Orchestration
main() {
    log "Starting Mutonex Monorepo Transformation..."
    check_environment
    initialize_structure
    transform_webclient
    transform_platform_and_infra
    verify_result
    log "Monorepo transformation COMPLETE."
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
