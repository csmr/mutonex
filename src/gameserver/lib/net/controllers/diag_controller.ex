defmodule Mutonex.Net.Controllers.DiagController do
  use Phoenix.Controller, formats: [:html, :json]
  require Logger

  def db_test(conn, _params) do
    repo_pid = Process.whereis(Mutonex.Server.Repo)

    if repo_pid == nil do
      json(conn, %{status: "error", db: "not_started"})
    else
      try do
        case Mutonex.Server.Repo.query("SELECT 1") do
          {:ok, _} -> json(conn, %{status: "ok", db: "connected"})
          {:error, err} ->
            Logger.error("DB Error: #{inspect(err)}")
            json(conn, %{status: "error", db: inspect(err)})
        end
      rescue
        e ->
          Logger.error("DB Exception: #{inspect(e)}")
          json(conn, %{status: "error", db: "exception"})
      end
    end
  end
end
