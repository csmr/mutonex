defmodule Mutonex.Net.Controllers.PageController do
  use Phoenix.Controller, formats: [:html, :json]

  def index(conn, _params) do
    path = Application.app_dir(:mutonex_server, "priv/static/index.html")
    conn
    |> put_resp_content_type("text/html")
    |> send_file(200, path)
  end
end
