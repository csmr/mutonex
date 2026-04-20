#!/bin/bash

# monorepo_transformer_20260329.sh
# Restructures Mutonex into a flat, top-level monorepo structure using git mv.

set -e # Exit on any error

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

# If exists, move source to target using git mv
safe_git_mv() {
    local src="$1"
    local dst="$2"
    if [ -e "$src" ]; then
        log "Git moving $src to $dst"
        mkdir -p "$(dirname "$dst")"
        git mv "$src" "$dst"
    fi
}

# If exists, move contents of dir to target dir using git mv
safe_git_mv_contents() {
    local src="$1"
    local dst="$2"
    if [ -d "$src" ]; then
        log "Git moving contents of $src to $dst"
        mkdir -p "$dst"
        for item in "$src"/*; do
            # Handle the case where the directory might be empty or glob fails
            [ -e "$item" ] || continue
            git mv "$item" "$dst/"
        done
        # Remove the now-empty source directory (non-git remove)
        rmdir "$src" 2>/dev/null || rm -rf "$src"
    fi
}

# Portable sed wrapper
apply_sed() {
    local pattern="$1"
    local file="$2"
    if [ -f "$file" ]; then
        sed -i "$pattern" "$file" 2>/dev/null || \
        sed -i '' "$pattern" "$file"
    fi
}

# Targeted sed wrapper for src/ removal
clean_src_paths() {
    local file="$1"
    if [ -f "$file" ]; then
        # Using -E for extended regex
        sed -E -i 's/src\/(webclient|gameserver|res|scripts|data|conf|compose\.yaml|devenv\.sh)/\1/g' "$file" 2>/dev/null || \
        sed -E -i '' 's/src\/(webclient|gameserver|res|scripts|data|conf|compose\.yaml|devenv\.sh)/\1/g' "$file"
    fi
}

check_environment() {
    if ! git merge-base --is-ancestor "$BASE_COMMIT" HEAD; then
        log "ERROR: Script must run from branch with $BASE_COMMIT."
        exit 1
    fi
    if [ ! -d "$SOURCE_DIR" ]; then
        log "ERROR: Source directory '$SOURCE_DIR' not found."
        exit 1
    fi
    if [ ! -d ".git" ]; then
        log "ERROR: Not a git repository."
        exit 1
    fi
}

# 4. Phase 1: Basic Structure Initialization
initialize_structure() {
    log "Initializing top-level directories..."
    mkdir -p "$TARGET_GAMESERVER" "$TARGET_WEBCLIENT" "$TARGET_CONTENT" \
             "$TARGET_INFRA" "$TARGET_SCRIPTS"
}

# 5. Phase 2: Webclient Module Transformation
transform_webclient() {
    log "Starting Phase 2: Webclient Module Transformation..."

    safe_git_mv_contents "$SOURCE_DIR/res" "$TARGET_CONTENT/res"
    safe_git_mv_contents "$SOURCE_DIR/ruleset" "$TARGET_CONTENT/ruleset"
    safe_git_mv_contents "$SOURCE_DIR/webclient" "$TARGET_WEBCLIENT"

    safe_git_mv "$SOURCE_DIR/deno.json" "$TARGET_WEBCLIENT/deno.json"
    safe_git_mv "$SOURCE_DIR/deno.lock" "$TARGET_WEBCLIENT/deno.lock"

    # Move webclient-related scripts
    for f in build-webclient.sh generate-api-key.js \
             hash-utils.ts make-credits.js; do
        safe_git_mv "$SOURCE_DIR/scripts/$f" "$TARGET_WEBCLIENT/$f"
    done

    # Patch Webclient
    local deno_cfg="$TARGET_WEBCLIENT/deno.json"
    apply_sed 's|webclient/main.ts|main.ts|g' "$deno_cfg"
    apply_sed 's|./dist/web.js|../dist/web.js|g' "$deno_cfg"

    local build_sh="$TARGET_WEBCLIENT/build-webclient.sh"
    apply_sed "s|source scripts/|source ../scripts/|g" "$build_sh"
    apply_sed "s|models_src=\"res/|models_src=\"../content/res/|g" "$build_sh"
    apply_sed "s|deno run -A ./scripts/|deno run -A ./|g" "$build_sh"
    apply_sed "s|deno run -A res/scripts/|deno run -A ../content/res/scripts/|g" "$build_sh"
    apply_sed "s|cp res/img/|cp ../content/res/img/|g" "$build_sh"
    apply_sed "s|webclient/|./|g" "$build_sh"
    apply_sed "s|gameserver/priv/static|../gameserver/priv/static|g" "$build_sh"
    apply_sed "s|distribution_target=\"../../dist\"|distribution_target=\"../dist\"|g" "$build_sh"

    local credits_js="$TARGET_WEBCLIENT/make-credits.js"
    apply_sed "s|./webclient/|./|g" "$credits_js"
    apply_sed "s|./dist/|../dist/|g" "$credits_js"

    local key_js="$TARGET_WEBCLIENT/generate-api-key.js"
    apply_sed "s|join(Deno.cwd(), \"webclient\",|join(Deno.cwd(),|g" "$key_js"
    apply_sed "s|join(Deno.cwd(), \".env\")|join(Deno.cwd(), \"..\", \".env\")|g" "$key_js"
    apply_sed "s|src/.env|.env|g" "$key_js"
    apply_sed "s|src/webclient/|webclient/|g" "$key_js"

    apply_sed "s|src/webclient/|webclient/|g" "$TARGET_WEBCLIENT/tests/test.sh"
}

# 6. Phase 3: Gameserver and Infrastructure
transform_platform_and_infra() {
    log "Starting Phase 3: Gameserver and Infrastructure..."

    safe_git_mv_contents "$SOURCE_DIR/gameserver" "$TARGET_GAMESERVER"
    safe_git_mv_contents "$SOURCE_DIR/conf" "$TARGET_INFRA/conf"
    safe_git_mv_contents "$SOURCE_DIR/data" "$TARGET_INFRA/data"

    safe_git_mv "$SOURCE_DIR/compose.yaml" "$TARGET_INFRA/compose.yaml"

    # Move remaining scripts
    for f in init-database-env.sh init-dotenv.sh test_endpoints.sh app.config.sh; do
        safe_git_mv "$SOURCE_DIR/scripts/$f" "$TARGET_SCRIPTS/$f"
    done

    log "Patching infra/compose.yaml..."
    local compose_yml="$TARGET_INFRA/compose.yaml"
    apply_sed 's| \.:/app| ../:/app|g' "$compose_yml"
    apply_sed 's| \./dist:| ../dist:|g' "$compose_yml"
    apply_sed 's|\./scripts/build-webclient.sh|../webclient/build-webclient.sh|g' "$compose_yml"
    apply_sed 's| \./gameserver:| ../gameserver:|g' "$compose_yml"
    apply_sed 's| \./res:| ../content/res:|g' "$compose_yml"
    apply_sed 's| - \./\.env| - ../.env|g' "$compose_yml"

    log "Patching app.config.sh..."
    local app_cfg="$TARGET_SCRIPTS/app.config.sh"
    # Use a more robust root-discovery logic
    apply_sed 's|BASE_DIR="$(realpath .)"|BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." \&\& pwd)"|g' "$app_cfg"
    apply_sed "s|DATA_HOME=\"\$BASE_DIR/data\"|DATA_HOME=\"\$BASE_DIR/infra/data\"|g" "$app_cfg"

    for f in init-database-env.sh init-dotenv.sh test_endpoints.sh; do
        apply_sed "s|source ./scripts/|source ./|g" "$TARGET_SCRIPTS/$f"
    done

    # Patch Elixir resource resolver
    local resource_ex="$TARGET_GAMESERVER/lib/utils/resource.ex"
    apply_sed 's|../../res/|../../content/res/|g' "$resource_ex"
    apply_sed 's|../../../res/|../../../content/res/|g' "$resource_ex"
}

# 7. Phase 4: Finalization and Validation
finalize_transformation() {
    log "Starting Phase 4: Finalization and Validation..."

    safe_git_mv "$SOURCE_DIR/CHANGELOG.md" "./CHANGELOG.md"
    safe_git_mv "$SOURCE_DIR/README.md" "./README.src.md"
    safe_git_mv "$SOURCE_DIR/.env.template" "./.env.template"

    # Move dist if it exists (might be ignored)
    if [ -d "$SOURCE_DIR/dist" ]; then
        mv "$SOURCE_DIR/dist" "./dist"
    fi
    # .env is ignored
    if [ -f "$SOURCE_DIR/.env" ]; then
        mv "$SOURCE_DIR/.env" "./.env"
    fi

    if [ -f "$SOURCE_DIR/devenv.sh" ]; then
        git mv "$SOURCE_DIR/devenv.sh" "./devenv.sh"
        apply_sed "s|source ./scripts/|source ./$TARGET_SCRIPTS/|g" "./devenv.sh"
        apply_sed "s|\./scripts/|./$TARGET_SCRIPTS/|g" "./devenv.sh"
        apply_sed "s|docker-compose up|cd $TARGET_INFRA \&\& docker-compose up|g" "./devenv.sh"
    fi

    # Final targeted cleanup of hardcoded references
    set +e
    grep -rl "src/" "$TARGET_GAMESERVER" "$TARGET_WEBCLIENT" "$TARGET_INFRA" "$TARGET_SCRIPTS" "$TARGET_CONTENT" docs/ .agents/ 2>/dev/null | while read -r file; do
        log "Cleaning paths in $file"
        clean_src_paths "$file"
    done
    set -e

    # Update .gitignore
    local gitignore=".gitignore"
    if [ -f "$gitignore" ]; then
        apply_sed "s|src/||g" "$gitignore"
        apply_sed "s|/res/|/content/res/|g" "$gitignore"
    fi

    # Remove the now empty src directory
    [ -d "$SOURCE_DIR" ] && rm -rf "$SOURCE_DIR"

    log "Verifying transformation..."
    (
        cd "$TARGET_INFRA"
        # Mock files for compose config validation if they don't exist
        mkdir -p data/conf conf
        touch ../.env data/.env.postgres data/conf/postgresql.conf data/conf/pg_hba.conf conf/nginx.conf

        if docker compose config > /dev/null 2>&1; then
            log "Docker Compose configuration is VALID."
        else
            log "ERROR: Docker Compose configuration is INVALID."
        fi
    ) || true
}

# 8. Execution Orchestration
main() {
    log "Starting Mutonex Monorepo Transformation..."
    check_environment
    initialize_structure
    transform_webclient
    transform_platform_and_infra
    finalize_transformation
    log "Monorepo transformation COMPLETE."
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
