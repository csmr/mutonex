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

# Disable Ecto Repo auto-start during test environment boot to ensure isolation.
config :mutonex_server, auto_start_ecto_repo: false

# Enable API key auth for security tests
config :mutonex_server, Mutonex.Net.Plugs.Auth,
  api_key_auth_enabled: true,
  api_key_hash: "test_hash"
