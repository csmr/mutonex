import Config

# Configure your endpoint
config :mutonex_server, Mutonex.Net.Endpoint,
  # The Cowboy port is configured by default under http: [port: 4000]
  http: [ip: {0, 0, 0, 0}, port: 4000],
  check_origin: false,
  code_reloader: true,
  debug_errors: true
