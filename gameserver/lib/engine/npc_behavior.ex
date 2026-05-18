defmodule Mutonex.Engine.NpcBehavior do
  @moduledoc """
  Stochastic behavior engine for NPCs and Fauna units.
  Selects actions based on unit type and society policy.
  """

  @type unit_type :: :local | :activist | :chief | :fauna | :air_power
  @type policy :: :passive | :aggressive | :defensive | :evasive

  # Behavior weights mapped by type and policy
  @weights %{
    fauna: %{
      default: %{rest: 40, jitter: 50, wander: 10}
    },
    local: %{
      passive: %{work: 60, build: 20, wander: 20},
      aggressive: %{work: 30, build: 10, wander: 60},
      defensive: %{work: 50, build: 40, wander: 10},
      evasive: %{work: 20, build: 10, wander: 70}
    },
    activist: %{
      passive: %{patrol: 80, defend: 20},
      aggressive: %{attack: 70, patrol: 20, destroy: 10},
      defensive: %{defend: 80, patrol: 20},
      evasive: %{patrol: 50, defend: 50}
    },
    chief: %{
      default: %{charm: 70, lead: 20, wander: 10}
    },
    air_power: %{
      default: %{patrol: 90, disable: 10}
    }
  }

  @doc """
  Decides the next action for an entity.
  """
  @spec decide_action(unit_type(), policy()) :: atom()
  def decide_action(type, policy \\ :passive) do
    type_cfg = Map.get(@weights, type, %{})

    # Attempt to find policy-specific weights or fall back
    weights =
      Map.get(type_cfg, policy) ||
        Map.get(type_cfg, :default) ||
        %{}

    select_weighted(weights)
  end

  @doc """
  Performs weighted random selection from a map.
  """
  @spec select_weighted(map()) :: atom()
  def select_weighted(weights) when map_size(weights) == 0 do
    :idle
  end

  def select_weighted(weights) do
    total = Enum.reduce(weights, 0, fn {_, w}, acc -> acc + w end)
    roll = :rand.uniform(total)

    weights
    |> Enum.sort_by(fn {_, w} -> w end, :desc)
    |> do_select(roll, 0)
  end

  defp do_select([{action, weight} | tail], roll, acc) do
    new_acc = acc + weight

    if roll <= new_acc do
      action
    else
      do_select(tail, roll, new_acc)
    end
  end

  defp do_select([], _, _), do: :idle
end
