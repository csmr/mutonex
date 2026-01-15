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

  # Public plugs (before Auth)
  plug :health_check
  plug :serve_index
  plug :db_check

  # Protected plugs
  plug Mutonex.Net.Plugs.Auth

  defp health_check(conn, _opts) do
    if conn.request_path == "/health" do
      send_resp(conn, 200, "OK") |> halt()
    else
      conn
    end
  end

  defp db_check(conn, _opts) do
    if conn.request_path == "/db-test" do
      # In decoupled tests, Repo might not be started. Check process alive first.
      repo_pid = Process.whereis(Mutonex.Server.Repo)

      cond do
        repo_pid == nil ->
          conn
          |> put_resp_content_type("application/json")
          |> send_resp(500, Jason.encode!(%{status: "error", message: "Repo not started"}))
          |> halt()

        true ->
          try do
            case Mutonex.Server.Repo.query("SELECT 1") do
              {:ok, _} ->
                conn
                |> put_resp_content_type("application/json")
                |> send_resp(200, Jason.encode!(%{status: "connected", database_url: "configured"}))
                |> halt()
              {:error, _} ->
                conn
                |> put_resp_content_type("application/json")
                |> send_resp(500, Jason.encode!(%{status: "error", message: "Database connection failed"}))
                |> halt()
            end
          rescue
            _ ->
              conn
              |> put_resp_content_type("application/json")
              |> send_resp(500, Jason.encode!(%{status: "error", message: "Database connection crashed"}))
              |> halt()
          end
      end
    else
      conn
    end
  end

  defp serve_index(conn, _opts) do
    if conn.request_path == "/" do
      path = Application.app_dir(:mutonex_server, "priv/static/index.html")
      conn
      |> put_resp_content_type("text/html")
      |> send_file(200, path)
      |> halt()
    else
      conn
    end
  end
end
