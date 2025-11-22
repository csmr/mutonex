defmodule Mutonex.Server.Application do
  use Application

  @impl true
  def start(_type, _args) do
    # List all top-level children for the supervision tree
    children = top_level_children(Mix.env())

    opts = [strategy: :one_for_one, name: Mutonex.Supervisor]
    Supervisor.start_link(children, opts)
  end

  # Returns children for the supervisor based on the Mix environment.
  defp top_level_children(env) do
    # Common children for all environments
    children = [
      {Phoenix.PubSub, [name: Mutonex.PubSub, pool_size: 1]},
      {Registry, [keys: :unique, name: Mutonex.GameRegistry]},
      {DynamicSupervisor, [name: Mutonex.GameSessionSupervisor, strategy: :one_for_one]},
      Mutonex.Net.Endpoint
    ]

    # Add GameLoop only for non-test environments
    if env != :test do
      children ++ [Mutonex.Engine.GameLoop]
    else
      children
    end
  end
end
