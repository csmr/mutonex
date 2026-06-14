defmodule Mutonex.Engine.FaunaBehavior do
  @moduledoc """
  Encapsulates the behavior and logic for Fauna entities.

  ## Coordinate System and Scale
  The game world uses a calibrated coordinate system where:
  *   **1 Coordinate Unit = 1 Kilometer**.
  *   Vertical (Y) axis represents elevation.
  *   Horizontal (X, Z) axes represent the sector plane.

  Movement speeds and deltas are calculated based on this scale.
  For example, a speed of 2.0 units/s represents 2 km/s (fast travel simulation).
  """

  alias Mutonex.Engine.Entities.Fauna
  alias Mutonex.Engine.NpcBehavior
  alias Mutonex.Utils.ConfigReader

  @doc """
  Spawns a given number of fauna entities for a specific sector.
  Returns a map of `%{fauna_id => %Fauna{}}`.
  """
  def spawn(sector_id, count) do
    Enum.reduce(1..count, %{}, fn i, acc ->
      id = "fauna_#{sector_id}_#{i}"
      # Scatter widely across the ground plane in the sector vicinity (-20 to 20 on X and Z)
      pos = %{x: (:rand.uniform() * 40 - 24), y: 0, z: (:rand.uniform() * 40 - 24)}
      # Charm range: -5 to 20
      charm = :rand.uniform(26) - 6

      fauna = %Fauna{
        id: id,
        sector_id: sector_id,
        position: pos,
        society: :fauna_local,
        charm: charm
      }

      Map.put(acc, id, fauna)
    end)
  end

  @doc """
  Calculates the new position for a fauna entity based on random movement rules.
  Stationary visuals mapped on frontend will ignore this jitter natively.
  Returns the updated `Fauna` struct.
  """
  def move(%Fauna{position: pos} = fauna) do
    # Stochastic action selection
    action = NpcBehavior.decide_action(:fauna)

    case action do
      :jitter -> apply_jitter(fauna, pos)
      :wander -> apply_wander(fauna, pos)
      :rest -> fauna
      _ -> fauna
    end
  end

  defp apply_jitter(fauna, pos) do
    range = ConfigReader.get(__MODULE__, :jitter_range, 0.14)

    dx = (:rand.uniform() - 0.5) * range
    dz = (:rand.uniform() - 0.5) * range
    new_pos = %{pos | x: pos.x + dx, z: pos.z + dz}
    %{fauna | position: new_pos}
  end

  defp apply_wander(fauna, pos) do
    range = ConfigReader.get(__MODULE__, :wander_range, 1.0)

    dx = (:rand.uniform() - 0.5) * range
    dz = (:rand.uniform() - 0.5) * range
    new_pos = %{pos | x: pos.x + dx, z: pos.z + dz}
    %{fauna | position: new_pos}
  end

  @doc """
  Returns a random delay in milliseconds for the next fauna tick.
  """
  def tick_delay do
    cfg = ConfigReader.get(__MODULE__)
    base = cfg[:tick_delay_base] || 2000
    rand = cfg[:tick_delay_random] || 8000
    :rand.uniform(rand) + base
  end
end
