defmodule Mutonex.Net.Controllers.DiagController do
  use Phoenix.Controller
  require Logger

  def db_test(conn, _params) do
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
        reraise e, __STACKTRACE__
    end
  end
end
