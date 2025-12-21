defmodule Mutonex.Engine.ActionsTest do
  use ExUnit.Case, async: true
  alias Mutonex.Engine.Actions
  alias Mutonex.Engine.Entities.{Unit, Mineral, Building, ConveyorBelt}

  test "build_conveyor success" do
    unit = %Unit{position: %{x: 10, y: 0, z: 10}}
    mineral = %Mineral{id: "m1", position: %{x: 10.5, y: 0, z: 10}}
    building = %Building{id: "b1", position: %{x: 0, y: 0, z: 0}}
    game_state = %{conveyors: []}

    assert {:ok, conveyor, updated_building} = Actions.build_conveyor(game_state, unit, mineral, building)
    assert conveyor.mineral_id == "m1"
    assert conveyor.building_id == "b1"
    assert "m1" in updated_building.connected_mineral_ids
  end

  test "build_conveyor fails when unit too far" do
    unit = %Unit{position: %{x: 0, y: 0, z: 0}}
    mineral = %Mineral{id: "m1", position: %{x: 10, y: 0, z: 10}} # Distance ~14.14
    building = %Building{id: "b1"}
    game_state = %{conveyors: []}

    assert {:error, :too_far} = Actions.build_conveyor(game_state, unit, mineral, building)
  end

  test "build_conveyor fails when mineral already connected" do
    unit = %Unit{position: %{x: 10, y: 0, z: 10}}
    mineral = %Mineral{id: "m1", position: %{x: 10, y: 0, z: 10}}
    building = %Building{id: "b1"}

    existing_conveyor = %ConveyorBelt{mineral_id: "m1", building_id: "other"}
    game_state = %{conveyors: [existing_conveyor]}

    assert {:error, :mineral_already_connected} = Actions.build_conveyor(game_state, unit, mineral, building)
  end
end
