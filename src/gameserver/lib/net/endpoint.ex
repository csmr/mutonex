defmodule Mutonex.Net.Endpoint do
  use Phoenix.Endpoint, otp_app: :mutonex_server

  socket "/live", Mutonex.Net.UserSocket,
    # TODO websocket: [timeout: 60_000], # Set a reasonable timeout
    websocket: [timeout: :infinity],
    longpoll: false

  # Serve static assets from the "priv/static" directory
  plug Plug.Static, at: "/", from: :mutonex_web

  @session_options [
    store: :cookie,
    key: "_mutonex_web_key",
    max_age: 1209600,
    same_site: "Lax",
    signing_salt: "some_long_and_random_string_for_signing_salt"
  ]

  # Plug to handle token authentication
  plug Plug.Parsers, parsers: [:urlencoded, :multipart, :json], json_decoder: Jason
  plug(Plug.MethodOverride)
  plug(Plug.Head)
  plug(Plug.Session, @session_options)
  plug Mutonex.Net.Plugs.Auth # Our authentication plug
  plug :health_check

  defp health_check(conn, _opts) do
    if conn.request_path == "/health" do
      send_resp(conn, 200, "OK") |> halt()
    else
      conn
    end
  end

end
