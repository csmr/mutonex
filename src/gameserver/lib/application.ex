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
  # This function head matches specifically for the :test atom.
  defp top_level_children(:test) do
    # Exclude stateful children like GameLoop during tests,
    # allowing test suites to manage their lifecycle instead.
    [
      Net.Endpoint
    ]
  end

  # This function head uses a wildcard to match any environment other than :test.
  defp top_level_children(_env) do
    [
      Net.Endpoint,
      Engine.GameLoop
    ]
  end
end
