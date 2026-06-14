defmodule Mutonex.Engine.Systems.Environment do
  alias Mutonex.Engine.{TerrainGenerator, SparseOctree}
  alias Mutonex.Engine.Systems.FaunaSystem
  alias Mutonex.Engine.Mineral, as: MineralLogic
  alias Mutonex.Engine.Entities.{Unit, Item}
  alias Mutonex.Utils.ConfigReader

  def initial_state(sid) do
    cfg = ConfigReader.get(__MODULE__)

    %{
      sector_id: sid,
      players: %{},
      tokens: %{},
      terrain: nil,
      game_time: cfg[:game_time] || 720,
      phase: :booting,
      fauna: %{},
      octree: nil,
      minerals: [],
      items: [],
      conveyors: [],
      buildings: [],
      sector_energy: cfg[:sector_energy] || 200.0,
      pending_start: false
    }
  end

  def build(s) do
    cfg = ConfigReader.get(__MODULE__)
    fauna_count = cfg[:fauna_spawn] || 22
    {fauna, octree} = spawn_fauna(s.sector_id, fauna_count)
    {tw, th} = cfg[:terrain_size] || {20, 20}
    {mc, mpos} = cfg[:mineral_spawn] || {5, %{x: 20, z: 20}}

    s = %{
      s
      | phase: :gamein,
        terrain: TerrainGenerator.generate_heightmap(tw, th),
        octree: octree,
        fauna: fauna,
        minerals: MineralLogic.spawn_minerals(mc, mpos),
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
    cfg = ConfigReader.get(__MODULE__)[:test_layout] || %{}

    types = [
      :mage,
      :phaistos_1,
      :phaistos_2,
      :worker,
      :headscarf,
      :robot,
      :airplane
    ]

    {ps, bs, _} =
      Enum.reduce(
        types,
        {s.players, s.buildings, -30},
        &do_spawn_unit_pair(&1, &2, cfg)
      )

    %{s | players: ps, buildings: bs}
  end

  defp do_spawn_unit_pair(type, {p_acc, b_acc, x}, cfg) do
    alias Mutonex.Engine.Systems.FactionResolver
    eth = FactionResolver.resolve_ethnicity()
    flv = FactionResolver.resolve_flavor()
    b = build_test_spawn_hub(type, x, eth, flv, cfg)
    u = build_test_unit(type, x, b.id, eth, flv, cfg)
    p = %{player: u, last_update: System.os_time(:millisecond)}
    {Map.put(p_acc, u.id, p), [b | b_acc], x + 10}
  end

  defp build_test_spawn_hub(type, x, eth, flv, cfg) do
    %Mutonex.Engine.Entities.Building{
      id: "birthplace_#{type}",
      type: :spawn_hub,
      position: %{x: x, y: 0, z: cfg[:spawn_hub_z] || 45},
      energy: 100.0,
      attributes: %{ethnicity: eth, element: flv, scale: cfg[:spawn_hub_scale] || 10.0}
    }
  end

  defp build_test_unit(type, x, bid, eth, flv, cfg) do
    %Unit{
      id: "test_unit_#{type}",
      type: type,
      position: %{x: x, y: 1, z: cfg[:unit_z] || 40},
      birthplace: bid,
      attributes: %{charm: 0, tribe: eth, flavor: flv, scale: 1.0}
    }
  end

  defp spawn_item_row(s) do
    cfg = ConfigReader.get(__MODULE__)[:test_layout] || %{}

    types = [
      :gem,
      :video_phone,
      :conveyor_belt,
      :society_policy,
      :sunspot_cream,
      :fiber_optic,
      :attack_modifier
    ]

    {is, _} =
      Enum.reduce(
        types,
        {[], -30},
        &do_spawn_item(&1, &2, cfg)
      )
    %{s | items: is ++ s.items}
  end

  defp do_spawn_item(type, {acc, x}, cfg) do
    item = %Item{
      id: "test_item_#{type}",
      type: type,
      position: %{x: x, y: 1, z: cfg[:item_z] || -40}
    }

    {[item | acc], x + 8}
  end

  defp spawn_building_row(s) do
    cfg = ConfigReader.get(__MODULE__)[:test_layout] || %{}

    types = [
      :tent,
      :houses,
      :cityscape,
      :power_structure,
      :moyai,
      :solar_panel
    ]

    {bs, _} =
      Enum.reduce(
        types,
        {s.buildings, -30},
        &do_spawn_building(&1, &2, cfg)
      )

    %{s | buildings: bs}
  end

  defp do_spawn_building(type, {acc, x}, cfg) do
    b = build_test_building(type, x, cfg)
    {[b | acc], x + 12}
  end

  defp build_test_building(type, x, cfg) do
    alias Mutonex.Engine.Systems.FactionResolver

    %Mutonex.Engine.Entities.Building{
      id: "test_building_#{type}",
      type: type,
      position: %{x: x, y: 0, z: cfg[:building_z] || 0},
      energy: 100.0,
      attributes: %{
        ethnicity: FactionResolver.resolve_ethnicity(),
        element: FactionResolver.resolve_flavor(),
        scale: Map.get(cfg[:building_scales] || %{}, type, 1.0)
      }
    }
  end

  defp spawn_fauna(sid, count) do
    FaunaSystem.initialize(
      sid,
      count,
      SparseOctree.new({-50, -50, -50, 50, 50, 50})
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
        id: "item_gem_01",
        type: :gem,
        position: %{x: 2, y: 1, z: 2}
      },
      %Item{
        id: "item_pager_01",
        type: :video_phone,
        position: %{x: -2, y: 1, z: -2}
      }
    ]
  end
end
