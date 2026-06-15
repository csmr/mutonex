defmodule Mutonex.Net.Endpoint do
  use Phoenix.Endpoint, otp_app: :mutonex_server
  alias Mutonex.Utils.ConfigReader

  socket "/socket", Mutonex.Net.UserSocket,
    websocket: [timeout: :infinity],
    longpoll: false

  # Serve static assets from the "priv/static" directory
  plug Plug.Static, at: "/", from: "priv/static"

  # Plug to handle token authentication
  plug Plug.Parsers,
    parsers: [:urlencoded, :multipart, :json],
    json_decoder: Jason

  plug Plug.MethodOverride
  plug Plug.Head

  plug Plug.Session, ConfigReader.get(__MODULE__, :session_options, [])

  # API Router
  plug Mutonex.Net.Router
end
