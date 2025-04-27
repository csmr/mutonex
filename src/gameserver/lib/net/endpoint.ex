defmodule Net.Endpoint do
  use Phoenix.Endpoint, otp_app: :mutonex_server

  socket "/live", Net.UserSocket,
    # TODO websocket: [timeout: 60_000], # Set a reasonable timeout
    websocket: [timeout: :infinity],
    longpoll: false

  def start(_type, _args) do
    # Minimal supervision tree
    children = [
      supervisor(Phoenix.PubSub, [name: Engine.PubSub]),
      supervisor(Net.Endpoint, [])
    ]
    Supervisor.start_link(children, strategy: :one_for_one, name: Engine.Supervisor)
  end

  # Serve static assets from the "priv/static" directory
  plug Plug.Static, at: "/", from: :mutonex_web

  # Plug to handle token authentication
  plug(Plug.Parsers, [:urlencoded, :multipart, :json])
  plug(Plug.MethodOverride)
  plug(Plug.Head)
  plug(Plug.Session, @session_options)
  plug(&handle_auth/2) # Our authentication plug

  @session_options [
    store: :cookie,
    key: "_mutonex_web_key",
    max_age: 1209600,
    same_site: "Lax"
  ]

  def handle_auth(conn, _opts) do
    token = get_req_header(conn, "authorization") |> List.first()

    case token do
      {"Bearer", auth_token} ->
        # In a real application, you'd verify this token against your auth service/database
        if valid_token?(auth_token) do
          # Store user info in the connection assigns if needed
          # conn = assign(conn, :current_user_id, user_id_from_token(auth_token))
          conn
        else
          send_resp(conn, 401, "Unauthorized") |> halt()
        end
      _ ->
        send_resp(conn, 401, "Unauthorized") |> halt()
    end
  end

  defp valid_token?(_token), do: true
    # Replace with actual token verification logic
    # defp user_id_from_token(token), do: ... 
    # Logic to extract user ID from token
    # TODO     # Example: JWT.decode(token, your_secret_key)
  end

  # Health check endpoint
  get "/health", conn, do: send_resp(conn, 200, "OK")

end
