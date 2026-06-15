import Config

# Configures the endpoint
config :mutonex_server, Mutonex.Net.Endpoint,
  url: [host: "localhost"],
  render_errors: [
    formats: [
      json: Mutonex.Net.ErrorJSON,
      html: Mutonex.Net.ErrorHTML
    ],
    layout: false
  ],
  pubsub_server: Mutonex.PubSub,
  live_view: [signing_salt: "your_secret_salt"],
  session_options: [
    store: :cookie,
    key: "_mutonex_web_key",
    max_age: 1_209_600,
    same_site: "Lax",
    signing_salt: System.get_env("PHX_SIGNING_SALT") || "dev_fallback_salt"
  ]

config :mutonex_server, Mutonex.Net.GameChannel,
  broadcast_after_join_delay_ms: 0 # Placeholder for potential delay if needed

config :mutonex_server, Mutonex.Net.Plugs.Auth,
  api_key_auth_enabled: System.get_env("API_KEY_AUTH_ENABLE") == "true",
  api_key_hash: System.get_env("API_KEY_HASH")

config :mutonex_server, Mutonex.Net.Notifier,
  module: Mutonex.Net.PhoenixNotifier
