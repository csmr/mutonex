defmodule Mutonex.Net.Endpoint do
  use Phoenix.Endpoint, otp_app: :mutonex_server

  socket "/socket", Mutonex.Net.UserSocket,
    # TODO websocket: [timeout: 60_000], # Set a reasonable timeout
    websocket: [timeout: :infinity],
    longpoll: false

  # Serve static assets from the "priv/static" directory
  plug Plug.Static, at: "/", from: "priv/static"

  @session_options [
    store: :cookie,
    key: "_mutonex_web_key",
    max_age: 1209600,
    same_site: "Lax",
    signing_salt: System.get_env("PHX_SIGNING_SALT") || "fallback_salt_for_dev_mode_only_12345"
  ]

  # Plug to handle token authentication
  plug Plug.Parsers,
       parsers: [:urlencoded, :multipart, :json],
       json_decoder: Jason

  plug(Plug.MethodOverride)
  plug(Plug.Head)
  plug(Plug.Session, @session_options)
  plug Mutonex.Net.Plugs.Auth # Our authentication plug
  plug :health_check
  plug :serve_index

  defp health_check(conn, _opts) do
    if conn.request_path == "/health" do
      send_resp(conn, 200, "OK") |> halt()
    else
      conn
    end
  end

  defp serve_index(conn, _opts) do
    if conn.request_path == "/" do
      conn
      |> put_resp_content_type("text/html")
      |> send_file(200, "priv/static/index.html")
      |> halt()
    else
      conn
    end
  end
end
