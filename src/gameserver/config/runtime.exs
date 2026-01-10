import Config

# Load secret from env or use default for dev
salt = System.get_env("PHX_SIGNING_SALT") || "dev_salt_fallback_12345"

config :mutonex_server, Mutonex.Net.Endpoint,
  secret_key_base: salt
