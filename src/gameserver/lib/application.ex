defmodule Mutonex.Server.Application do
  use Application

  def start(_type, _args) do
    Net.Endpoint.start(:normal, [])
  end
end
