# This file is responsible for configuring your application
# and its dependencies with the aid of the Config module.
#
# This configuration file is loaded before any dependency and
# is restricted to this project.

import Config

config :mutonex_server,
  ecto_repos: [Mutonex.Server.Repo]

# Configures the endpoint
config :mutonex_server, Mutonex.Net.Endpoint,
  url: [host: "localhost"],
  render_errors: [
    formats: [html: false],
    layout: false
  ],
  pubsub_server: Mutonex.PubSub,
  live_view: [signing_salt: "your_secret_salt"]

# Configures Elixir's Logger
config :logger, :console,
  format: "$time $message\n",
  metadata: [:request_id]

# Use Jason for JSON parsing in Phoenix
config :phoenix, :json_library, Jason

# Import environment specific config. This must remain at the bottom
# of this file so it overrides the configuration defined above.
import_config "#{config_env()}.exs"
