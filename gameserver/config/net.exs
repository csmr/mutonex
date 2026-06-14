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
  live_view: [signing_salt: "your_secret_salt"]
