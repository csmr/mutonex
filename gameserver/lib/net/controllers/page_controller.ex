defmodule Mutonex.Net.Controllers.PageController do
  use Phoenix.Controller, formats: [:html, :json]

  # sobelow_skip ["Traversal.SendFile"]
  def index(conn, _params) do
    conn
    |> put_resp_content_type("text/html")
    |> send_file(200, "priv/static/index.html")
  end

  def well_known(conn, _params) do
    conn
    |> put_resp_content_type("application/json")
    |> send_resp(404, "{}")
  end
end
