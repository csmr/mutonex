#!/bin/bash
set -e

# Delegate execution to canonical webclient test runner
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
bash "${SCRIPT_DIR}/../webclient/tests/test.sh" "$@"
