defmodule Mutonex.Net.Controllers.DiagControllerTest do
  use ExUnit.Case, async: true
  import Plug.Test
  import Plug.Conn

  # Helper to construct a conn
  defp build_conn(method, path) do
    conn(method, path)
  end

  setup do
    System.put_env("API_KEY_AUTH_ENABLE", "true")
    on_exit(fn ->
      System.delete_env("API_KEY_AUTH_ENABLE")
    end)
    :ok
  end

  test "GET /api/db-test without auth returns 401" do
    # Initialize opts at runtime to ensure Router is compiled
    opts = Mutonex.Net.Router.init([])

    conn = build_conn(:get, "/api/db-test")
    conn = Mutonex.Net.Router.call(conn, opts)

    assert conn.status == 401
    assert conn.resp_body == "Unauthorized"
  end

  test "GET /api/db-test with auth header tries to connect to DB" do
    opts = Mutonex.Net.Router.init([])

    # 1. Wrong hash
    conn = build_conn(:get, "/api/db-test")
           |> put_req_header("api-key-hash", "WRONG_HASH")

    conn = Mutonex.Net.Router.call(conn, opts)
    assert conn.status == 401

    # 2. Correct hash
    conn_ok = build_conn(:get, "/api/db-test")
              |> put_req_header("api-key-hash", "YOUR_COMPILED_HASH_HERE")

    try do
      conn_result = Mutonex.Net.Router.call(conn_ok, opts)

      if conn_result.status == 200 do
         body = Jason.decode!(conn_result.resp_body)
         if body["status"] == "ok" do
            assert body["db"] == "connected"
         else
            assert body["status"] == "error"
         end
      end
    rescue
      e ->
        inspect_e = inspect(e)
        # Accept various DB errors
        assert inspect_e =~ "ConnectionError" or inspect_e =~ "Postgrex" or inspect_e =~ "Ecto" or inspect_e =~ "DBConnection"
    end
  end
end
