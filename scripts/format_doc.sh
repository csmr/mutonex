#!/bin/bash
set -e

# scripts/format_doc.sh
# Code & document formatting utility.

FORMAT_INPLACE=false

for arg in "$@"; do
    if [ "$arg" = "-f" ] || [ "$arg" = "--format-inplace" ]; then
        FORMAT_INPLACE=true
    fi
done

mode_str="Report Mode (Check)"
if [ "$FORMAT_INPLACE" = true ]; then
    mode_str="Format Inplace (-f)"
fi

echo "======================================================"
echo "         DOCUMENT & CODE FORMATTING UTILITY          "
echo "======================================================"
echo "Mode: $mode_str"

TRAILING_SPACE_COUNT=0
OVER_LENGTH_COUNT=0

check_file() {
    local file="$1"
    [ -f "$file" ] || return 0

    if grep -q '[[:space:]]$' "$file"; then
        TRAILING_SPACE_COUNT=$((TRAILING_SPACE_COUNT + 1))
        if [ "$FORMAT_INPLACE" = true ]; then
            sed -i 's/[[:space:]]*$//' "$file"
        fi
    fi

    local over_lines
    over_lines=$(python3 -c '
import sys
with open("'$file'", errors="ignore") as f:
    lines = f.readlines()
bad = [i+1 for i, l in enumerate(lines) if len(l.rstrip()) > 67]
print(len(bad))
' 2>/dev/null || echo 0)

    if [ "$over_lines" -gt 0 ]; then
        OVER_LENGTH_COUNT=$((OVER_LENGTH_COUNT + 1))
    fi
}

for ext in ts md json; do
    while IFS= read -r f; do
        check_file "$f"
    done < <(find webclient/ -name "*.$ext" 2>/dev/null)
done

echo "------------------------------------------------------"
echo "Trailing Whitespace Issues: $TRAILING_SPACE_COUNT"
echo "Files Exceeding 67 Chars:   $OVER_LENGTH_COUNT"

if command -v deno &> /dev/null; then
    echo "Running Deno Formatter..."
    if [ "$FORMAT_INPLACE" = true ]; then
        deno fmt webclient/
    else
        deno fmt --check webclient/ || true
    fi
else
    echo "Deno fmt skipped (deno not found in PATH)."
fi

echo "======================================================\n"
