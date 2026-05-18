defmodule Mutonex.Engine.Systems.Environment do
  alias Mutonex.Engine.{TerrainGenerator, SparseOctree}
  alias Mutonex.Engine.Systems.FaunaSystem
  alias Mutonex.Engine.Mineral, as: MineralLogic
  alias Mutonex.Engine.Entities.{Unit, Item}

  def initial_state(sid) do
    %{
      sector_id: sid,
      players: %{},
      tokens: %{},
      terrain: nil,
      game_time: 720,
      phase: :booting,
      fauna: %{},
      octree: nil,
      minerals: [],
      items: [],
      conveyors: [],
      buildings: [],
      sector_energy: 200.0, # Watts per m2
      pending_start: false
    }
  end

  def build(s) do
    {fauna, octree} = spawn_fauna(s.sector_id)
    s = %{s | 
      phase: :gamein,
      terrain: TerrainGenerator.generate_heightmap(20, 20),
      octree: octree,
      fauna: fauna,
      minerals: MineralLogic.spawn_minerals(5, %{x: 20, z: 20}),
      items: spawn_items(),
      players: add_dummies(s.players),
      pending_start: false
    }
    if String.contains?(s.sector_id, "test") do
      apply_test_layout(s)
    else
      s
    end
  end

  defp apply_test_layout(s) do
    s
    |> spawn_unit_row()
    |> spawn_item_row()
    |> spawn_building_row()
  end

  defp spawn_unit_row(s) do
    # Archetypes from glyph_profiles.json
    types = [:mage, :phaistos_1, :phaistos_2, :worker, :headscarf, :robot, :airplane]
    
    {ps, bs, _} = Enum.reduce(types, {s.players, s.buildings, -30}, fn type, {p_acc, b_acc, x} ->
      id = "test_unit_#{type}"
      # Create a birthplace building for this unit
      building = %Mutonex.Engine.Entities.Building{
        id: "birthplace_#{type}",
        type: :spawn_hub,
        position: %{x: x, y: 0, z: 45},
        energy: 100.0,
        attributes: %{
          # Randomized if region/mineral not defined
          ethnicity: Mutonex.Engine.Systems.FactionResolver.resolve_ethnicity(),
          element: Mutonex.Engine.Systems.FactionResolver.resolve_flavor(),
          scale: 10.0 # Spawn hub scale
        }
      }
      
      unit = %Unit{
        id: id,
        type: type,
        position: %{x: x, y: 1, z: 40},
        birthplace: building.id,
        attributes: %{
          charm: 0,
          tribe: building.attributes.ethnicity,
          flavor: building.attributes.element,
          scale: 1.0 # Default unit scale
        }
      }
      
      new_ps = Map.put(p_acc, id, %{player: unit, last_update: System.os_time(:millisecond)})
      new_bs = [building | b_acc]
      {new_ps, new_bs, x + 10}
    end)
    
    %{s | players: ps, buildings: bs}
  end

  defp spawn_item_row(s) do
    # Archetypes from glyph_profiles.json (item_default)
    types = [:gem, :video_phone, :conveyor_belt, :society_policy, :sunspot_cream, :fiber_optic, :attack_modifier]
    
    {is, _} = Enum.reduce(types, {[], -30}, fn type, {acc, x} ->
      id = "test_item_#{type}"
      item = %Item{
        id: id,
        type: type,
        position: %{x: x, y: 1, z: -40}
      }
      {[item | acc], x + 8}
    end)
    
    %{s | items: is ++ s.items}
  end

  defp spawn_building_row(s) do
    # Stationary / Building archetypes
    types = [:tent, :houses, :cityscape, :power_structure, :moyai, :solar_panel]
    
    {bs, _} = Enum.reduce(types, {s.buildings, -30}, fn type, {acc, x} ->
      id = "test_building_#{type}"
      building = %Mutonex.Engine.Entities.Building{
        id: id,
        type: type,
        position: %{x: x, y: 0, z: 0},
        energy: 100.0,
        attributes: %{
          ethnicity: Mutonex.Engine.Systems.FactionResolver.resolve_ethnicity(),
          element: Mutonex.Engine.Systems.FactionResolver.resolve_flavor(),
          scale: case type do
            :power_structure -> 10.0
            :cityscape -> 4.0
            :moyai -> 3.0
            :solar_panel -> 5.0
            :houses -> 1.5
            :tent -> 0.8
            _ -> 1.0
          end
        }
      }
      {[building | acc], x + 12}
    end)
    
    %{s | buildings: bs}
  end

  defp spawn_fauna(sid) do
    FaunaSystem.initialize(
      sid, 22, SparseOctree.new({-50, -50, -50, 50, 50, 50})
    )
  end

  def add_dummies(ps) do
    ts = System.os_time(:millisecond)
    d1 = %Unit{
      id: "dummy_player_alpha", 
      type: :head, 
      position: %{x: 5, y: 1, z: -5}, 
      attributes: %{charm: 10, scale: 1.0}
    }
    d2 = %Unit{
      id: "npc_charmable_beta", 
      type: :follower, 
      position: %{x: -5, y: 1, z: 5}, 
      is_charmable: true, 
      attributes: %{charm: 5, scale: 0.9}
    }
    ps 
    |> Map.put(d1.id, %{player: d1, last_update: ts}) 
    |> Map.put(d2.id, %{player: d2, last_update: ts})
  end

  def spawn_items do
    [
      %Item{
        id: "item_gem_01", type: :gem, position: %{x: 2, y: 1, z: 2}
      },
      %Item{
        id: "item_pager_01", type: :video_phone, position: %{x: -2, y: 1, z: -2}
      }
    ]
  end
end
