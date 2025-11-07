#!/bin/bash
# Automated setup script for the Elixir gameserver.
# This script is intended to be used by AI agents to set up the
# development environment and run tests.
set -e # exit immediate if command return non-zero status
$INSTALLER=".agents/install-elixir.sh"

# 1. Install Elixir and Hex
if ! command -v elixir &> /dev/null
then
    echo "Elixir not found. Installing..."
    "$INSTALLER" elixir@1.18.4 otp@28.0.2
    export PATH=$HOME/.elixir-install/installs/otp/28.0.2/bin:$PATH
    export PATH=$HOME/.elixir-install/installs/elixir/1.18.4-otp-27/bin:$PATH
fi

# 2. Change to the gameserver directory and install dependencies
# This is necessary because mix commands must be run from the
# directory containing the mix.exs file.
(cd src/gameserver && mix local.hex --force && mix deps.get)

# 3. Install Deno
if ! command -v deno &> /dev/null
then
    echo "Deno not found. Installing..."
    curl -fsSL https://deno.land/x/install/install.sh | sh
    export DENO_INSTALL="$HOME/.deno"
    export PATH="$DENO_INSTALL/bin:$PATH"
fi

# 4. Generate API key and set session salt
deno run --allow-read --allow-write src/scripts/generate-api-key.js
source ./.env
export PHX_SESSION_SALT=$API_KEY_HASH

# 5. Run tests
(cd src/gameserver && mix test)
