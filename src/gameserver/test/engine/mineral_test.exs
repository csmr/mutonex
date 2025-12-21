defmodule Mutonex.Engine.MineralTest do
  use ExUnit.Case, async: true
  alias Mutonex.Engine.Mineral
  alias Mutonex.Engine.Entities.{Mineral, ConveyorBelt}

  test "spawn_minerals creates correct number of minerals" do
    minerals = Mutonex.Engine.Mineral.spawn_minerals(5, %{x: 100, z: 100})
    assert length(minerals) == 5
    assert %Mineral{} = List.first(minerals)
  end

  test "spawned minerals have valid types" do
    [mineral | _] = Mutonex.Engine.Mineral.spawn_minerals(1, %{x: 10, z: 10})
    assert is_binary(mineral.type) or is_atom(mineral.type)
    assert mineral.amount > 0
  end

  test "build_conveyor creates a valid struct" do
    conveyor = Mutonex.Engine.Mineral.build_conveyor("min_1", "build_1")
    assert %ConveyorBelt{} = conveyor
    assert conveyor.mineral_id == "min_1"
    assert conveyor.building_id == "build_1"
    assert conveyor.status == :building
  end
end
