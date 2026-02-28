defmodule Mutonex.Net.Controllers.HealthController do
  use Phoenix.Controller, formats: [:html, :json]

  def index(conn, _params) do
    text(conn, "OK")
  end
end
