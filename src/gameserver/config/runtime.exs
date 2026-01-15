import Config

salt = System.get_env("PHX_SIGNING_SALT") || "dev_salt_fallback_12345"

config :mutonex_server, Mutonex.Net.Endpoint,
  secret_key_base: salt,
  live_view: [signing_salt: salt] # Use same salt for LV signing if needed

# Configure Repo in all environments (including test, if we want to test connectivity)
# Ideally, test environment uses a specific test DB, but for this "connectivity check" test,
# we need the Repo to be started.
if true do
  database_url =
    System.get_env("DATABASE_URL") ||
      raise """
      environment variable DATABASE_URL is missing.
      """

  config :mutonex_server, Mutonex.Server.Repo,
    url: database_url,
    pool_size: String.to_integer(System.get_env("POOL_SIZE") || "10")
end
