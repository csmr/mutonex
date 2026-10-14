defmodule Mutonex.Engine.ActionsTest do
  use ExUnit.Case, async: true
  alias Mutonex.Engine.Actions
  alias Mutonex.Engine.Systems.Actions, as: SystemActions
  alias Mutonex.Engine.Entities.{Unit, Mineral, Building, ConveyorBelt}

  test "build_conveyor success" do
    unit = %Unit{position: %{x: 10, y: 0, z: 10}}
    mineral = %Mineral{id: "m1", position: %{x: 10.5, y: 0, z: 10}}
    building = %Building{id: "b1", position: %{x: 0, y: 0, z: 0}}
    game_state = %{conveyors: []}

    assert {:ok, conveyor, upd_bld} =
             Actions.build_conveyor(game_state, unit, mineral, building)
    assert conveyor.mineral_id == "m1"
    assert conveyor.building_id == "b1"
    assert "m1" in upd_bld.connected_mineral_ids
  end

  test "build_conveyor fails when unit too far" do
    unit = %Unit{position: %{x: 0, y: 0, z: 0}}
    mineral = %Mineral{id: "m1", position: %{x: 20, y: 0, z: 20}}
    building = %Building{id: "b1"}
    game_state = %{conveyors: []}

    assert {:error, :too_far} =
             Actions.build_conveyor(game_state, unit, mineral, building)
  end

  test "build_conveyor fails when mineral already connected" do
    unit = %Unit{position: %{x: 10, y: 0, z: 10}}
    mineral = %Mineral{id: "m1", position: %{x: 10, y: 0, z: 10}}
    building = %Building{id: "b1"}

    existing = %ConveyorBelt{mineral_id: "m1", building_id: "b0"}
    game_state = %{conveyors: [existing]}

    assert {:error, :mineral_already_connected} =
             Actions.build_conveyor(game_state, unit, mineral, building)
  end

  test "build_powerstructure success" do
    unit = %Unit{position: %{x: 0, y: 0, z: 0}, society_id: "s1"}
    target = %{x: 2.0, y: 0.0, z: 2.0}
    existing = [%Building{id: "b0", type: :tent, position: %{x: 50, y: 0, z: 50}}]

    assert {:ok, b} = Actions.build_powerstructure(unit, target, existing)
    assert b.type == :power_structure
    assert b.sight_area == 100.0
    assert b.society_id == "s1"
  end

  test "build_powerstructure fails on perimeter violation" do
    unit = %Unit{position: %{x: 0, y: 0, z: 0}}
    target = %{x: 1.0, y: 0.0, z: 0.0}
    existing = [%Building{id: "b0", type: :tent, position: %{x: 0, y: 0, z: 0}, perimeter_radius: 2.0}]

    assert {:error, :perimeter_violation} =
             Actions.build_powerstructure(unit, target, existing)
  end

  test "build_powerstructure fails when target too far" do
    unit = %Unit{position: %{x: 0, y: 0, z: 0}}
    target = %{x: 50.0, y: 0.0, z: 50.0}

    assert {:error, :too_far} =
             Actions.build_powerstructure(unit, target, [])
  end

  test "build_fiber success" do
    unit = %Unit{position: %{x: 0, y: 0, z: 0}, society_id: "s1"}
    target = %{x: 5.0, y: 0.0, z: 0.0}

    assert {:ok, fb} = Actions.build_fiber(unit, target)
    assert fb.type == :fiber_optic
    assert fb.society_id == "s1"
  end

  test "install_lidar successfully installs LIDAR into building" do
    unit = %Unit{id: "u1", position: %{x: 0, y: 0, z: 0}, inventory: ["item_lidar_1"]}
    building = %Building{id: "b1", position: %{x: 2, y: 0, z: 2}, sight_area: 10.0, attributes: %{}}
    state = %{
      players: %{"u1" => %{player: unit, last_update: 0}},
      buildings: [building]
    }

    assert {:ok, new_state} = SystemActions.install_lidar("u1", "b1", state)
    updated_unit = new_state.players["u1"].player
    updated_building = Enum.find(new_state.buildings, &(&1.id == "b1"))

    assert "item_lidar_1" not in updated_unit.inventory
    assert updated_building.sight_area == 60.0
    assert updated_building.attributes[:has_lidar] == true
  end

  test "SystemActions.build_powerstructure executes successfully" do
    unit = %Unit{id: "u1", position: %{x: 0, y: 0, z: 0}}
    state = %{
      players: %{"u1" => %{player: unit, last_update: 0}},
      buildings: []
    }
    meta = %{"x" => 5.0, "y" => 0.0, "z" => 0.0}

    assert {:ok, ns} = SystemActions.build_powerstructure("u1", meta, state)
    assert length(ns.buildings) == 1
    assert List.first(ns.buildings).type == :power_structure
  end

  test "SystemActions.build_conveyor executes successfully" do
    unit = %Unit{id: "u1", position: %{x: 0, y: 0, z: 0}, inventory: ["item_conveyor_1"]}
    min = %Mineral{id: "m1", position: %{x: 1, y: 0, z: 0}}
    bld = %Building{id: "b1", position: %{x: 0, y: 0, z: 0}, connected_mineral_ids: []}
    state = %{
      players: %{"u1" => %{player: unit, last_update: 0}},
      minerals: [min],
      buildings: [bld],
      conveyors: []
    }
    meta = %{"mineral_id" => "m1", "building_id" => "b1"}

    assert {:ok, ns} = SystemActions.build_conveyor("u1", meta, state)
    assert length(ns.conveyors) == 1
    assert "item_conveyor_1" not in ns.players["u1"].player.inventory
  end

  test "SystemActions.build_fiber executes successfully" do
    unit = %Unit{id: "u1", position: %{x: 0, y: 0, z: 0}, inventory: ["item_fiber_1"]}
    state = %{
      players: %{"u1" => %{player: unit, last_update: 0}},
      buildings: []
    }
    meta = %{"x" => 3.0, "y" => 0.0, "z" => 0.0}

    assert {:ok, ns} = SystemActions.build_fiber("u1", meta, state)
    assert length(ns.buildings) == 1
    assert List.first(ns.buildings).type == :fiber_optic
    assert "item_fiber_1" not in ns.players["u1"].player.inventory
  end
end
