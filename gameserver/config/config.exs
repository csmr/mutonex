# This file is responsible for configuring your application
# and its dependencies with the aid of the Config module.
#
# This configuration file is loaded before any dependency and
# is restricted to this project.

import Config

config :mutonex_server,
  ecto_repos: [Mutonex.Server.Repo],
  webclient_message_token_enabled: false,
  auto_start_ecto_repo: true

# Modular configurations
import_config "engine.exs"
import_config "net.exs"
import_config "simtellus.exs"
import_config "utils.exs"

# Configures Elixir's Logger
config :logger, :console,
  format: "$time $message\n",
  metadata: [:request_id]

# Use Jason for JSON parsing in Phoenix
config :phoenix, :json_library, Jason

# Import environment specific config. This must remain at the bottom
# of this file so it overrides the configuration defined above.
import_config "#{config_env()}_environment.exs"
