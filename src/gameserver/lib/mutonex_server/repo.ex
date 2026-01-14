defmodule Mutonex.Server.Repo do
  use Ecto.Repo,
    otp_app: :mutonex_server,
    adapter: Ecto.Adapters.Postgres
end
