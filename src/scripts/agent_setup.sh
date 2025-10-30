#!/bin/bash
# Automated setup script for the Elixir gameserver.
# This script is intended to be used by AI agents to set up the
# development environment and run tests.
set -e

# 1. Install Elixir and Hex
if ! command -v elixir &> /dev/null
then
    echo "Elixir not found. Installing..."
    # This script was originally in src/gameserver, so the path to install.sh
    # has been adjusted from ../../install.sh to ./install.sh to reflect its
    # new location in src/scripts when run from the root directory.
    ./install.sh elixir@1.18.4 otp@28.0.2
    export PATH=$HOME/.elixir-install/installs/otp/28.0.2/bin:$PATH
    export PATH=$HOME/.elixir-install/installs/elixir/1.18.4-otp-27/bin:$PATH
fi

# 2. Change to the gameserver directory and install dependencies
# This is necessary because mix commands must be run from the
# directory containing the mix.exs file.
cd src/gameserver
mix local.hex --force
mix deps.get

# 3. Run tests
export PHX_SESSION_SALT="some-secret-salt"
mix test
