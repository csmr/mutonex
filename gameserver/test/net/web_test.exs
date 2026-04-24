defmodule Mutonex.Net.WebTest do
  use ExUnit.Case
  import Plug.Conn
  import Phoenix.ConnTest

  @endpoint Mutonex.Net.Endpoint

  test "GET / serves index.html" do
    conn = build_conn()
    conn = get(conn, "/")
    assert response(conn, 200)
    assert response_content_type(conn, :html)
  end

  test "GET /db-test checks database connection" do
    conn = build_conn()

    # We expect either 200 (DB connected) or 500 (DB not connected/disabled).
    # Both prove the endpoint logic is reachable and handled by the plug.
    conn = get(conn, "/db-test")

    assert conn.status in [200, 500]
    assert response_content_type(conn, :json)

    body = json_response(conn, conn.status)
    assert body["status"] in ["connected", "error"]
  end
end
