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
case Mix.env() do
  :test ->
    import_config("test.exs")

  _ ->
    # In development and production, we rely on environment variables
    # for configuration.
    database_url =
      System.get_env("DATABASE_URL") ||
        raise "DATABASE_URL environment variable is not set"

    config :mutonex_server, Mutonex.Server.Repo,
      url: database_url,
      pool_size: String.to_integer(System.get_env("POOL_SIZE") || "10")

    # The secret key base is used to sign sessions and other sensitive data.
    # It must be at least 64 characters long and generated with `mix phx.gen.secret`.
    secret_key_base =
      System.get_env("SECRET_KEY_BASE") ||
        raise "SECRET_KEY_BASE environment variable is not set"

    config :mutonex_server, Mutonex.Net.Endpoint,
      secret_key_base: secret_key_base
end
