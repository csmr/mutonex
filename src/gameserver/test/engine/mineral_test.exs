defmodule Mutonex.Engine.MineralTest do
  use ExUnit.Case, async: true
  alias Mutonex.Engine.Mineral
  alias Mutonex.Engine.Entities.{Mineral, ConveyorBelt}

  test "spawn_minerals creates correct number of minerals" do
    minerals = Mutonex.Engine.Mineral.spawn_minerals(5, %{x: 100, z: 100})
    assert length(minerals) == 5
    assert %Mineral{} = List.first(minerals)
  end

  test "spawned minerals have valid types and size" do
    [mineral | _] = Mutonex.Engine.Mineral.spawn_minerals(1, %{x: 10, z: 10})
    assert is_binary(mineral.type)
    assert String.length(mineral.type) > 0
    assert mineral.amount > 0
    assert mineral.size == 2.0
  end

  test "get_random_type returns a valid element name" do
    type = Mutonex.Engine.Mineral.get_random_type()
    assert is_binary(type)
    assert String.match?(type, ~r/^[A-Z][a-z]+/)
  end

  test "get_bounding_box returns correct coordinates" do
    mineral = %Mineral{position: %{x: 10, y: 10, z: 10}, size: 2.0}
    bbox = Mutonex.Engine.Mineral.get_bounding_box(mineral)

    assert bbox.min.x == 9.0
    assert bbox.max.x == 11.0
    assert bbox.min.y == 9.0
    assert bbox.max.y == 11.0
  end

  test "build_conveyor creates a valid struct" do
    conveyor = Mutonex.Engine.Mineral.build_conveyor("min_1", "build_1")
    assert %ConveyorBelt{} = conveyor
    assert conveyor.mineral_id == "min_1"
    assert conveyor.building_id == "build_1"
    assert conveyor.status == :building
  end
end
