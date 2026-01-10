import Config

# In production, we would use secrets from environment variables.
# For simplicity in this dev/agent setup, we use a default if not set,
# but now we support reading PHX_SIGNING_SALT.

signing_salt = System.get_env("PHX_SIGNING_SALT") || "some_long_and_random_string_for_signing_salt"

config :mutonex_server, Mutonex.Net.Endpoint,
  # ... other config ...
  secret_key_base: signing_salt # Often distinct, but for minimal setup we can reuse or define another.

# Note: The Endpoint module itself reads configuration.
# We need to make sure the Endpoint module uses this config.
