# Mutonex Implementation Style

Mutonex is implemented with a functional style where possible, using Elixir, Ruby, and Deno JavaScript interpreters. For development and hosting purposes, each Mutonex component runs in a container defined in `compose.yaml`. The implementation minimizes coupling between modules and especially seeks to minimize coupling and dependencies in test scripts, which should be standalone and exist for each module.

## Elixir Setup for Bots

To set up the Elixir environment for a bot, run the following script. This script will install Elixir and Erlang, update the PATH, and install the Hex package manager.

```bash
# Install Elixir and Erlang
curl -fsSO https://elixir-lang.org/install.sh
sh install.sh elixir@latest otp@latest

# Update PATH
export PATH=$HOME/.elixir-install/installs/otp/28.0.2/bin:$PATH
export PATH=$HOME/.elixir-install/installs/elixir/1.18.4-otp-27/bin:$PATH

# Install Hex
mix local.hex --force
```
