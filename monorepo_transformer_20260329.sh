#!/bin/bash

# monorepo_transformer_20260329.sh
# Restructures Mutonex into a flat, top-level monorepo structure.

# 1. Immutable Truth
BASE_COMMIT="cea3b25c0c80ada2ab99dc7982a46907fc49373f"

# 2. Configuration
SCRIPT_NAME=$(basename "$0")
SOURCE_DIR="src"
TARGET_PLATFORM="platform"
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
    mkdir -p "$TARGET_PLATFORM" "$TARGET_WEBCLIENT" "$TARGET_CONTENT" \
             "$TARGET_INFRA" "$TARGET_SCRIPTS"
}

# 5. Phase 2: Webclient Module Transformation (and dependencies)
transform_webclient() {
    log "Starting Phase 2: Webclient Module Transformation..."

    log "Moving dependencies..."
    safe_move "$SOURCE_DIR/res" "$TARGET_CONTENT/"
    safe_move "$SOURCE_DIR/scripts/app.config.sh" "$TARGET_SCRIPTS/"

    log "Moving webclient module..."
    [ -d "$SOURCE_DIR/webclient" ] && {
        mv "$SOURCE_DIR/webclient"/* "$TARGET_WEBCLIENT/"
        rm -rf "$SOURCE_DIR/webclient"
    }
    safe_move "$SOURCE_DIR/deno.json" "$TARGET_WEBCLIENT/"
    safe_move "$SOURCE_DIR/deno.lock" "$TARGET_WEBCLIENT/"

    log "Patching webclient config..."
    local deno_cfg="$TARGET_WEBCLIENT/deno.json"
    apply_sed 's|webclient/main.ts|main.ts|g' "$deno_cfg"
    apply_sed 's|./dist/web.js|../dist/web.js|g' "$deno_cfg"

    log "Moving webclient scripts..."
    for f in build-webclient.sh generate-api-key.js \
             hash-utils.ts make-credits.js; do
        safe_move "$SOURCE_DIR/scripts/$f" "$TARGET_WEBCLIENT/"
    done

    log "Patching webclient scripts..."
    local build_sh="$TARGET_WEBCLIENT/build-webclient.sh"
    local key_js="$TARGET_WEBCLIENT/generate-api-key.js"

    apply_sed "s|source scripts/|source ../$TARGET_SCRIPTS/|g" "$build_sh"
    apply_sed "s|models_src=\"res/|models_src=\"../$TARGET_CONTENT/res/|g" "$build_sh"
    apply_sed "s|deno run -A ./scripts/|deno run -A ./|g" "$build_sh"
    apply_sed "s|deno run -A res/scripts/|deno run -A ../$TARGET_CONTENT/res/scripts/|g" "$build_sh"
    apply_sed "s|cp res/img/|cp ../$TARGET_CONTENT/res/img/|g" "$build_sh"
    apply_sed "s|webclient/|./|g" "$build_sh"
    apply_sed "s|gameserver/priv/static|../$TARGET_PLATFORM/priv/static|g" "$build_sh"

    apply_sed "s|join(Deno.cwd(), \"webclient\",|join(Deno.cwd(),|g" "$key_js"
    apply_sed "s|join(Deno.cwd(), \".env\")|join(Deno.cwd(), \"..\", \".env\")|g" "$key_js"
}

# 6. Execution Orchestration
main() {
    log "Starting Mutonex Monorepo Transformation..."
    check_environment
    initialize_structure
    transform_webclient
    log "Phase 2 complete: Webclient Module transformed."
}

# Run if executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
