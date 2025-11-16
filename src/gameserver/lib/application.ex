defmodule Mutonex.Server.Application do
  use Application

  @impl true
  def start(_type, _args) do
    # Add all top-level children here
      # 1. Phoenix Endpoint (PubSub, Registry, and Supervisors)
      # 2. Game Loop (turns)
    children = [
      Net.Endpoint,
      Engine.GameLoop
    ]

    opts = [strategy: :one_for_one, name: Mutonex.Supervisor]
    Supervisor.start_link(children, opts)
  end

end
