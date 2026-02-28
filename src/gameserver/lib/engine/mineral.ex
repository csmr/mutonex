defmodule Mutonex.Engine.Mineral do
  @moduledoc """
  Handles Mineral logic, spawning and management.
  """
  alias Mutonex.Engine.Entities.{Mineral, ConveyorBelt}
  alias Mutonex.Utils.Resource

  # Resolve path for elements.yml (local & container)
  @elements_path Resource.resolve_path(
    "elements.yml",
    __DIR__
  )

  @external_resource @elements_path

  # Load elements map at compile time
  @elements YamlElixir.read_from_file!(@elements_path)
            |> Enum.map(fn {_k, v} -> v end)

  @doc "Returns a random mineral type."
  def get_random_type, do: Enum.random(@elements)

  @doc "Spawns minerals with random types and positions."
  def spawn_minerals(count, bounds) do
    Enum.map(1..count, fn i ->
      uid = System.unique_integer([:positive])

      %Mineral{
        id: "mineral_#{i}_#{uid}",
        # Cluster within Lidar view frustum: [-5, 5] on X, [5, 15] on Z
        # Camera spawns at (0, 10, 20) looking towards origin (0, 0, 0)
        position: %{
          x: (:rand.uniform() * 10 - 5),
          y: 0,
          z: (:rand.uniform() * 10 + 5)
        },
        type: get_random_type(),
        amount: :rand.uniform(5000) + 500,
        size: 2.0
      }
    end)
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
