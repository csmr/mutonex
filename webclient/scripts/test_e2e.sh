#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
WEBCLIENT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$WEBCLIENT_DIR"

if ! command -v python3 &> /dev/null; then
    echo "Error: 'python3' not found."
    exit 1
fi

python3 "$SCRIPT_DIR/run_e2e_test.py"
