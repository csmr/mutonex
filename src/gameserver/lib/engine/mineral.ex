defmodule Mutonex.Engine.Mineral do
  @moduledoc """
  Handles Mineral logic, including spawning and management.
  """
  alias Mutonex.Engine.Entities.{Mineral, ConveyorBelt}

  @elements_path Path.expand("../../../res/elements.yml", __DIR__)
  @external_resource @elements_path

  # Load elements map at compile time
  # Format in YAML is "Number: Name"
  # We want a list of names or atoms.
  @elements YamlElixir.read_from_file!(@elements_path)
            |> Enum.map(fn {_k, v} -> v end)

  @doc """
  Returns a random mineral type from the loaded elements.
  """
  def get_random_type do
    Enum.random(@elements)
  end

  @doc """
  Spawns a list of minerals with random types and positions.
  """
  def spawn_minerals(count, bounds) do
    Enum.map(1..count, fn i ->
      %Mineral{
        id: "mineral_#{i}_#{System.unique_integer([:positive])}",
        position: %{
          x: :rand.uniform() * bounds.x,
          y: 0, # Assuming ground level
          z: :rand.uniform() * bounds.z
        },
        type: get_random_type(),
        amount: :rand.uniform(5000) + 500,
        size: 2.0
      }
    end)
  end

  @doc """
  Creates a conveyor belt connecting a mineral to a building.
  """
  def build_conveyor(mineral_id, building_id) do
    %ConveyorBelt{
      id: "conveyor_#{mineral_id}_#{building_id}",
      mineral_id: mineral_id,
      building_id: building_id,
      status: :building
    }
  end

  @doc """
  Returns the bounding box of the mineral as %{min: %{x,y,z}, max: %{x,y,z}}.
  """
  def get_bounding_box(%Mineral{position: pos, size: size}) do
    half_size = size / 2.0
    %{
      min: %{
        x: pos.x - half_size,
        y: pos.y - half_size,
        z: pos.z - half_size
      },
      max: %{
        x: pos.x + half_size,
        y: pos.y + half_size,
        z: pos.z + half_size
      }
    }
  end
end
