defmodule Mutonex.Server.Application do
  use Application

  @impl true
  def start(_type, _args) do
    # List all top-level children for the supervision tree
    env = Mix.env()
    children = top_level_children(env)
    opts = [strategy: :one_for_one, name: Mutonex.Supervisor]

    Supervisor.start_link(children, opts)
  end

  # --- Private Helpers ---

  defp top_level_children(:test) do
    base_children() |> add_repo()
  end

  defp top_level_children(_env) do
    sim_logic = [
      Mutonex.Simtellus.Simulation,
      Mutonex.Engine.GameLoop
    ]

    base_children()
    |> Kernel.++(sim_logic)
    |> add_repo()
  end

  defp add_repo(children) do
    enabled =
      Application.get_env(
        :mutonex_server,
        :auto_start_ecto_repo,
        true
      )

    case enabled do
      true -> [Mutonex.Server.Repo | children]
      false -> children
    end
  end

  defp base_children do
    [
      {Phoenix.PubSub, [name: Mutonex.PubSub, pool_size: 1]},
      {Registry, [keys: :unique, name: Mutonex.GameRegistry]},
      {DynamicSupervisor,
       [name: Mutonex.GameSessionSupervisor, strategy: :one_for_one]},
      Mutonex.Net.Endpoint
    ]
  end
end
