defmodule Mutonex.Engine.FaunaBehavior do
  @moduledoc """
  Encapsulates behavior and logic for Fauna entities.
  """

  alias Mutonex.Engine.Entities.Fauna
  alias Mutonex.Engine.NpcBehavior
  alias Mutonex.Engine.Stippling
  alias Mutonex.Utils.ConfigReader

  @doc "Spawns fauna entities using Poisson disk sampling."
  def spawn(sector_id, count, opts \\ []) do
    b = Keyword.get(opts, :bounds, default_bounds())
    r = Keyword.get(opts, :min_dist, 3.5)
    stippled = Stippling.generate_points(bounds: b, min_dist: r)
    positions = get_positions(stippled, count, b)
    items = Enum.zip(1..count, positions)

    Enum.reduce(items, %{}, fn {i, pos}, acc ->
      id = "fauna_#{sector_id}_#{i}"
      f = build_fauna(id, sector_id, pos)
      Map.put(acc, id, f)
    end)
  end

  defp default_bounds do
    %{x_min: -24.0, x_max: 16.0, z_min: -24.0, z_max: 16.0}
  end

  defp get_positions(pts, count, _b) when length(pts) >= count do
    Enum.take(pts, count)
  end

  defp get_positions(pts, count, b) do
    needed = count - length(pts)
    pts ++ Enum.map(1..needed, fn _ -> random_pos(b) end)
  end

  defp random_pos(b) do
    x = b.x_min + :rand.uniform() * (b.x_max - b.x_min)
    z = b.z_min + :rand.uniform() * (b.z_max - b.z_min)
    %{x: x, y: 0.0, z: z}
  end

  defp build_fauna(id, sector_id, pos) do
    charm = :rand.uniform(26) - 6

    %Fauna{
      id: id,
      sector_id: sector_id,
      position: pos,
      society: :fauna_local,
      charm: charm
    }
  end

  @doc "Calculates new position based on movement rules."
  def move(%Fauna{position: pos} = fauna) do
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

  @doc "Returns random delay in milliseconds for next tick."
  def tick_delay do
    cfg = ConfigReader.get(__MODULE__)
    base = cfg[:tick_delay_base] || 2000
    rand = cfg[:tick_delay_random] || 8000
    :rand.uniform(rand) + base
  end
end
