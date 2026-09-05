defmodule Mutonex.Engine.Mineral do
  @moduledoc """
  Handles Mineral logic, spawning and management.
  """
  alias Mutonex.Engine.Entities.{Mineral, ConveyorBelt}
  alias Mutonex.Engine.Stippling
  alias Mutonex.Utils.Resource

  @elements_path Resource.resolve_path("elements.yml", __DIR__)
  @external_resource @elements_path
  @elements YamlElixir.read_from_file!(@elements_path)
            |> Enum.map(fn {_k, v} -> v end)

  @doc "Returns a random mineral type."
  def get_random_type, do: Enum.random(@elements)

  @doc "Spawns minerals with Poisson disk stippled positions."
  def spawn_minerals(count, bounds \\ nil) do
    b = bounds || default_bounds()
    stippled = Stippling.generate_points(bounds: b, min_dist: 2.0)
    positions = get_positions(stippled, count, b)
    zipped = Enum.zip(1..count, positions)

    Enum.map(zipped, fn {i, pos} ->
      uid = System.unique_integer([:positive])
      type = pick_mineral_type()

      %Mineral{
        id: "mineral_#{i}_#{uid}",
        position: pos,
        type: type,
        amount: :rand.uniform(5000) + 500,
        size: 2.0
      }
    end)
  end

  defp default_bounds do
    %{x_min: -5.0, x_max: 5.0, z_min: 5.0, z_max: 15.0}
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

  defp pick_mineral_type do
    if :rand.uniform() > 0.5 do
      Enum.random(["🌱", "🌲", "🌳", "🌴", "🌵", "🌾", "🍄", "🌺", "🌻"])
    else
      get_random_type()
    end
  end

  @doc "Creates conveyor belt mineral -> building."
  def build_conveyor(min_id, bld_id) do
    %ConveyorBelt{
      id: "conveyor_#{min_id}_#{bld_id}",
      mineral_id: min_id,
      building_id: bld_id,
      status: :building
    }
  end

  @doc "Returns the bounding box of the mineral."
  def get_bounding_box(%Mineral{position: p, size: s}) do
    half = s / 2.0

    %{
      min: %{x: p.x - half, y: p.y - half, z: p.z - half},
      max: %{x: p.x + half, y: p.y + half, z: p.z + half}
    }
  end
end
