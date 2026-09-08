defmodule Mutonex.Engine.Systems.Actions do
  alias Mutonex.Engine.Entities.{Unit, Item, Fauna, Building}

  # Action entry points
  def charm(src, tgt, s) do
    with %{} = u1 <- get_unit(s, src),
         %{} = u2 <- get_target(s, tgt),
         true <- charm_valid?(u1, u2) do
      {:ok, apply_charm(u2, src, s)}
    else
      _ -> {:error, :invalid}
    end
  end

  def pick_up(src, itm_id, s) do
    with %Unit{} = u <- get_unit(s, src),
         %Item{} = i <- get_item(s, itm_id),
         true <- dist(u.position, i.position) <= 15.0 do
      {:ok, apply_pickup(src, i, s)}
    else
      _ -> {:error, :invalid}
    end
  end

  def drop(src, itm_id, meta, s) do
    p = s.players[src]

    if p && itm_id in p.player.inventory do
      {:ok, apply_drop(src, itm_id, meta, p.player, s)}
    else
      {:error, :invalid}
    end
  end

  def install_lidar(src, bld_id, s) do
    with %Unit{} = u <- get_unit(s, src),
         %Building{} = b <- get_building(s, bld_id),
         lidar when not is_nil(lidar) <- find_lidar(u.inventory),
         true <- dist(u.position, b.position) <= 15.0 do
      {:ok, apply_install_lidar(src, lidar, b, s)}
    else
      _ -> {:error, :invalid}
    end
  end

  # Success helpers
  defp apply_charm(%Unit{} = t, sid, s) do
    p = %{
      player: %{t | is_charmable: false, society_id: sid},
      last_update: System.os_time(:millisecond)
    }
    %{s | players: Map.put(s.players, t.id, p)}
  end

  defp apply_charm(%Fauna{} = t, sid, s) do
    f = %{t | is_charmable: false, society: sid}
    %{s | fauna: Map.put(s.fauna, t.id, f)}
  end

  defp apply_charm(%Building{} = b, sid, s) do
    nb = %{b | status: :active, society_id: sid, energy: 100.0}
    bs = Enum.map(s.buildings, fn cur ->
      if cur.id == b.id, do: nb, else: cur
    end)
    %{s | buildings: bs}
  end

  defp apply_pickup(uid, itm, s) do
    p = s.players[uid]
    unit = %{p.player | 
      inventory: [itm.id | p.player.inventory]
    }
    ps = Map.put(s.players, uid, %{p | player: unit})
    is = Enum.reject(s.items, &(&1.id == itm.id))
    %{s | items: is, players: ps}
  end

  defp apply_drop(uid, itm, meta, unit, s) do
    inv = Enum.reject(unit.inventory, &(&1 == itm))
    type = get_item_type(itm)
    pos = calculate_drop_pos(unit.position, meta)
    ni = %Item{id: itm, type: type, position: pos}
    p = %{s.players[uid] | player: %{unit | inventory: inv}}
    ps = Map.put(s.players, uid, p)
    %{s | items: [ni | s.items], players: ps}
  end

  defp calculate_drop_pos(pos, %{
         "x" => dx,
         "y" => dy,
         "z" => dz
       }) do
    # Defensive: apply 1m offset in direction DX, DY, DZ
    %{x: pos.x + dx, y: pos.y + dy, z: pos.z + dz}
  end

  defp calculate_drop_pos(pos, _), do: pos

  # Utilities
  defp charm_valid?(u1, %Building{} = b) do
    (b.status == :ruined || b.society_id == nil) &&
      dist(u1.position, b.position) <= 20.0
  end

  defp charm_valid?(u1, u2) do
    u2.is_charmable && dist(u1.position, u2.position) <= 20.0
  end

  defp apply_install_lidar(uid, lidar_id, b, s) do
    p = s.players[uid]
    inv = List.delete(p.player.inventory, lidar_id)
    u = %{p.player | inventory: inv}
    ps = Map.put(s.players, uid, %{p | player: u})
    attrs = b.attributes || %{}
    b_attr = Map.put(attrs, :has_lidar, true)
    b_upd = %{b | sight_area: b.sight_area + 50.0,
                  attributes: b_attr}
    bs = update_building_list(s.buildings, b_upd)
    %{s | players: ps, buildings: bs}
  end

  defp update_building_list(bs, updated) do
    Enum.map(bs, fn b ->
      if b.id == updated.id, do: updated, else: b
    end)
  end

  defp find_lidar(inv) do
    Enum.find(inv, &is_lidar?/1)
  end

  defp is_lidar?(item_id) when is_binary(item_id) do
    String.starts_with?(item_id, "item_lidar") or
      item_id == "lidar"
  end
  defp is_lidar?(_), do: false

  defp get_building(s, id) do
    Enum.find(s.buildings, &(&1.id == id))
  end

  defp get_item_type(itm) do
    case itm do
      "item_gem" <> _ -> :gem
      "item_pager" <> _ -> :video_phone
      "item_lidar" <> _ -> :lidar
      "lidar" -> :lidar
      _ -> :unknown
    end
  end

  defp dist(p1, p2) do
    dx = :math.pow(p1.x - p2.x, 2)
    dy = :math.pow(p1.y - p2.y, 2)
    dz = :math.pow(p1.z - p2.z, 2)
    :math.sqrt(dx + dy + dz)
  end

  defp get_item(s, id), do: Enum.find(s.items, &(&1.id == id))
  defp get_unit(s, id) do
    if p = s.players[id], do: p.player, else: nil
  end

  defp get_target(s, id) do
    get_unit(s, id) || s.fauna[id] || find_b(s.buildings, id)
  end

  defp find_b(bs, id), do: Enum.find(bs, &(&1.id == id))
end
