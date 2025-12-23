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

  @doc """
  Spawns a given number of fauna entities for a specific sector.
  Returns a map of `%{fauna_id => %Fauna{}}`.
  """
  def spawn(sector_id, count) do
    Enum.reduce(1..count, %{}, fn i, acc ->
      id = "fauna_#{sector_id}_#{i}"
      # Random position within typical bounds (e.g. 0-20)
      # 20 units = 20 km sector width
      pos = %{x: :rand.uniform() * 20, y: 0, z: :rand.uniform() * 20}
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
  Returns the updated `Fauna` struct.
  """
  def move(%Fauna{position: pos} = fauna) do
    # Random small movement (reduced range for "short" travel)
    # 0.5 magnitude max = 0.5 km
    dx = (:rand.uniform() - 0.5) * 0.5
    dz = (:rand.uniform() - 0.5) * 0.5
    new_pos = %{pos | x: pos.x + dx, z: pos.z + dz}

    %{fauna | position: new_pos}
  end

  @doc """
  Returns a random delay in milliseconds for the next fauna tick.
  Range: 2000 to 10000 ms.
  """
  def tick_delay do
    :rand.uniform(8000) + 2000
  end
end
