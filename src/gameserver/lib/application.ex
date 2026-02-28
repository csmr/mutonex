defmodule Mutonex.Server.Application do
  use Application

  @impl true
  def start(_type, _args) do
    # List all top-level children for the supervision tree
    children = top_level_children(Mix.env())

    opts = [strategy: :one_for_one, name: Mutonex.Supervisor]
    Supervisor.start_link(children, opts)
  end

  # Returns the base children for all environments.
  defp base_children do
    [
      {Phoenix.PubSub, [name: Mutonex.PubSub, pool_size: 1]},
      {Registry, [keys: :unique, name: Mutonex.GameRegistry]},
      {DynamicSupervisor, [name: Mutonex.GameSessionSupervisor, strategy: :one_for_one]},
      Mutonex.Net.Endpoint
    ]
  end

  # For the :test environment, we start only the base children.
  # (Actually, we might want Repo for integration tests, but let's follow the plan)
  defp top_level_children(:test) do
    if Application.get_env(:mutonex_server, :start_repo, true) do
      [Mutonex.Server.Repo | base_children()]
    else
      base_children()
    end
  end

  # For all other environments, we start the base children plus the GameLoop.
  defp top_level_children(_env) do
    children = base_children() ++ [Mutonex.Simtellus.Simulation, Mutonex.Engine.GameLoop]

    if Application.get_env(:mutonex_server, :start_repo, true) do
      [Mutonex.Server.Repo | children]
    else
      children
    end
  end
end
