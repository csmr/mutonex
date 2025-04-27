defmodule Engine.App do
  use Application

  def start(_type, _args) do
    Net.Endpoint.start(:normal, [])
  end

  def config() do
    [
      mod: {Engine.App, []},
      children: [] # Minimal: Endpoint is the main supervisor
    ]
  end
end
