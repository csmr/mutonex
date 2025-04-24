efmodule MutonexWeb.Endpoint do
  use Phoenix.Endpoint, otp_app: :mutonex_server

  socket "/live", MutonexWeb.UserSocket,
    websocket: [timeout: :infinity],
    longpoll: false

  def start(_type, _args) do
    # Minimal supervision tree
    children = [
      supervisor(Phoenix.PubSub, [name: Mutonex.PubSub]),
      supervisor(MutonexWeb.Endpoint, [])
    ]
    Supervisor.start_link(children, strategy: :one_for_one, name: Mutonex.Supervisor)
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

  defp valid_token?(_token), do: true # Replace with actual token verification logic
  # defp user_id_from_token(token), do: ... # Logic to extract user ID from token
end

defmodule MutonexWeb.UserSocket do
  use Phoenix.Socket

  channel "game:*", MutonexWeb.GameChannel

  def connect(params, socket) do
    # In a real application, you might verify the token passed in socket connect params
    # {:ok, assign(socket, :user_id, user_id_from_token(params["token"]))}
    {:ok, assign(socket, :user_id, :guest)} # Minimal: just assign a guest user
  end

  def id(socket), do: "user:#{socket.assigns.user_id}"
end

defmodule MutonexWeb.GameChannel do
  use Phoenix.Channel

  def join("game:" <> sector_id, _payload, socket) do
    # Minimal: just join the channel
    {:ok, socket}
  end

  def handle_in("move", payload, socket) do
    # Minimal: log the move
    IO.inspect({socket.assigns.user_id, "moved", payload})
    {:noreply, socket}
  end
end

defmodule Mutonex.Application do
  use Application

  def start(_type, _args) do
    MutonexWeb.Endpoint.start(:normal, [])
  end

  def config() do
    [
      mod: {Mutonex.Application, []},
      children: [] # Minimal: Endpoint is the main supervisor
    ]
  end
end
