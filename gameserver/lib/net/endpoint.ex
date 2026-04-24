defmodule Mutonex.Net.Endpoint do
  use Phoenix.Endpoint, otp_app: :mutonex_server

  socket "/socket", Mutonex.Net.UserSocket,
    websocket: [timeout: :infinity],
    longpoll: false

  # Serve static assets from the "priv/static" directory
  plug Plug.Static, at: "/", from: "priv/static"

  @session_options [
    store: :cookie,
    key: "_mutonex_web_key",
    max_age: 1209600,
    same_site: "Lax",
    signing_salt: System.get_env("PHX_SIGNING_SALT") || "dev_fallback_salt"
  ]

  # Plug to handle token authentication
  plug Plug.Parsers,
       parsers: [:urlencoded, :multipart, :json],
       json_decoder: Jason

  plug(Plug.MethodOverride)
  plug(Plug.Head)
  plug(Plug.Session, @session_options)

  # API Router
  plug Mutonex.Net.Router
end
