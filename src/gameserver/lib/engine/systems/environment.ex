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
      pending_start: false
    }
  end

  def build(s) do
    {fauna, octree} = spawn_fauna(s.sector_id)
    %{s | 
      phase: :gamein,
      terrain: TerrainGenerator.generate_heightmap(20, 20),
      octree: octree,
      fauna: fauna,
      minerals: MineralLogic.spawn_minerals(5, %{x: 20, z: 20}),
      items: spawn_items(),
      players: add_dummies(s.players),
      pending_start: false
    }
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
      attributes: %{charm: 10}
    }
    d2 = %Unit{
      id: "npc_charmable_beta", 
      type: :follower, 
      position: %{x: -5, y: 1, z: 5}, 
      is_charmable: true, 
      attributes: %{charm: 5}
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
