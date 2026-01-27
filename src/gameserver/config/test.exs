import Config

# We don't need a server during test. If one is required,
# you can enable the server option below.
config :mutonex_server, Mutonex.Net.Endpoint,
  http: [ip: {127, 0, 0, 1}, port: 4001],
  secret_key_base: "H8Z9+Y/PZ8Z9+Y/PZ8Z9+Y/PZ8Z9+Y/PZ8Z9+Y/PZ8Z9+Y/PZ8Z9+Y/PZ8Z9+Y/P",
  server: false

# Print only warnings and errors during test
config :logger, level: :warning

# Initialize plugs at runtime for faster test compilation
config :phoenix, :plug_init_mode, :runtime

# Use the mock Simtellus client in tests
config :mutonex_server, :simtellus_client, Mutonex.Engine.SimtellusClientMock

# Do not start Repo in test by default to avoid connection errors in isolation
config :mutonex_server, start_repo: false
