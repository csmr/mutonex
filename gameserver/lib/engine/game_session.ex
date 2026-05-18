defmodule Mutonex.Engine.GameSession do
  use GenServer
  require Logger
  alias Mutonex.Engine.Entities.{Unit, GameState}
  alias Mutonex.Engine.Systems.{Environment, Actions}
  alias Mutonex.Utils.MessageToken
  alias Mutonex.Net.Endpoint
  alias Mutonex.Engine.SimtellusClient

  @max_speed_ms (8000 * 1000 / 3600)
  @action_dispatch %{
    "charm" => :charm,
    "pick_up" => :pick_up,
    "drop_item" => :drop
  }

  # --- Client API ---
  def start_link(sid) do
    GenServer.start_link(__MODULE__, sid, name: via_tuple(sid))
  end

  def get_initial_state(pid) do
    GenServer.call(pid, :get_initial_state)
  end

  # --- Callbacks ---
  def init(sid) do
    send(self(), :check_simtellus)
    schedule_token_rotation()
    schedule_sector_tick()
    {:ok, Environment.initial_state(sid)}
  end

  defp schedule_sector_tick do
    # Sector turn is ~17s per GDD, but for testing we use a faster rate (5s)
    Process.send_after(self(), :tick_sector, 5000)
  end

  def handle_call(:get_initial_state, _from, s) do
    resp = %{
      phase: Atom.to_string(s.phase),
      game_state: build_payload(s)
    }
    {:reply, resp, s}
  end

  def handle_info(:check_simtellus, s) do
    client = Application.get_env(
      :mutonex_server, :simtellus_client, SimtellusClient
    )
    case client.is_available?() do
      true -> process_availability(s)
      false -> Process.send_after(self(), :check_simtellus, 1000); {:noreply, s}
    end
  end

  def handle_info(:tick_sector, s) do
    if s.phase == :gamein do
      new_buildings = Enum.map(s.buildings, fn b ->
        if b.status == :active do
          scale = Map.get(b.attributes, :scale, 1.0)
          # Energy/Turn = Scale * SectorWatts - Maintenance(3W)
          new_energy = max(0, min(100.0, b.energy + (scale * s.sector_energy) - 3.0))
          status = if new_energy <= 0, do: :ruined, else: :active
          %{b | energy: new_energy, status: status}
        else
          b
        end
      end)

      # 2. Update Players (Energy depletion)
      new_players = Enum.into(s.players, %{}, fn {uid, p} ->
        # Deplete energy by 0.5 per tick (mobile)
        new_unit = %{p.player | energy: max(0, p.player.energy - 0.5)}
        new_unit = if new_unit.energy <= 0, do: %{new_unit | status: :mummified}, else: new_unit
        {uid, %{p | player: new_unit}}
      end)
      
      ns = %{s | buildings: new_buildings, players: new_players}
      
      # 3. Broadcast updates (including buildings and fauna)
      broadcast_state_update(ns.sector_id, ns.players, ns.items, ns.buildings, ns.fauna)
      
      schedule_sector_tick()
      {:noreply, ns}
    else
      schedule_sector_tick()
      {:noreply, s}
    end
  end

  def handle_info(:rotate_tokens, s) do
    ts = Enum.into(s.players, %{}, fn {uid, _} ->
      t = MessageToken.generate()
      old = s.tokens[uid]
      if p = old[:pid], do: send(p, {:new_token, t})
      {uid, %{current: t, previous: old[:current], pid: old[:pid]}}
    end)
    schedule_token_rotation()
    {:noreply, %{s | tokens: ts}}
  end

  def handle_info({:update_planet_state, data}, s) do
    # Update sector energy from Simtellus data
    new_energy = Map.get(data, "energy", s.sector_energy)
    {:noreply, %{s | sector_energy: new_energy}}
  end

  def handle_info({:tick_fauna, id}, s) do
    if s.phase == :gamein do
      {f, o} = Mutonex.Engine.Systems.FaunaSystem.process_tick(s, id)
      {:noreply, %{s | fauna: f, octree: o}}
    else
      {:noreply, s}
    end
  end

  def handle_cast({:player_joined, uid, pid}, s) do
    s = add_player_if_missing(s, uid)
    t = MessageToken.generate()
    send(pid, {:new_token, t})
    ts = Map.put(s.tokens, uid, %{current: t, previous: nil, pid: pid})
    s = %{s | tokens: ts}
    case s.phase do
      :lobby -> start_session(s)
      :booting -> {:noreply, %{s | pending_start: true}}
      :gamein -> 
        broadcast_state_update(s.sector_id, s.players)
        {:noreply, s}
      _ -> {:noreply, s}
    end
  end

  def handle_cast({:avatar_update, uid, pos, token}, s) do
    val = validate_token_internal(s, uid, token)
    if should_process?(val, s.phase),
      do: do_avatar_update(uid, pos, s, val),
      else: {:noreply, sync_tokens(s, uid, val)}
  end

  def handle_cast({:player_action, src, act, target, meta}, s) do
    case {s.phase, Map.get(@action_dispatch, act)} do
      {:gamein, func} ->
        apply(__MODULE__, func, [src, target, meta, s])

      _ ->
        {:noreply, s}
    end
  end

  # --- Action Delegates ---
  def charm(src, tgt, _meta, s) do
    case Actions.charm(src, tgt, s) do
      {:ok, ns} ->
        process_charm_broadcast(tgt, ns, s)
        {:noreply, ns}

      _ ->
        {:noreply, s}
    end
  end

  def pick_up(src, itm_id, _meta, s) do
    case Actions.pick_up(src, itm_id, s) do
      {:ok, ns} ->
        broadcast_state_update(s.sector_id, ns.players, ns.items)
        {:noreply, ns}

      _ ->
        {:noreply, s}
    end
  end

  def drop(src, itm_id, meta, s) do
    case Actions.drop(src, itm_id, meta, s) do
      {:ok, ns} ->
        broadcast_state_update(s.sector_id, ns.players, ns.items)
        {:noreply, ns}

      _ ->
        {:noreply, s}
    end
  end

  # --- Helpers --- #

  defp start_session(s) do
    s = Environment.build(s)
    Endpoint.broadcast("game:#{s.sector_id}", "game_phase", %{phase: "gamein"})
    Endpoint.broadcast("game:#{s.sector_id}", "game_state", build_payload(s))
    {:noreply, s}
  end

  defp process_availability(s) do
    if s.pending_start, do: start_session(s), else: lobby(s)
  end
  defp lobby(s) do
    Endpoint.broadcast("game:#{s.sector_id}", "game_phase", %{phase: "lobby"})
    {:noreply, %{s | phase: :lobby}}
  end

  defp process_charm_broadcast(tgt, ns, s) do
    p = ns.players[tgt]

    if p && is_struct(p.player, Unit) do
      broadcast_state_update(s.sector_id, ns.players)
    else
      Endpoint.broadcast(
        "game:#{s.sector_id}",
        "fauna_update",
        %{fauna: fauna_to_list(ns.fauna)}
      )
    end
  end

  defp do_avatar_update(uid, [x, y, z], s, val) do
    s = sync_tokens(s, uid, val)
    handle_player_update(s.players[uid], uid, %{x: x, y: y, z: z}, System.os_time(:millisecond), s)
  end

  defp handle_player_update(nil, uid, pos, time, s) do
    p = %{player: %Unit{id: uid, type: :head, position: pos}, last_update: time}
    update_and_broadcast(s, uid, p)
  end

  defp handle_player_update(p, uid, pos, time, s) do
    if can_update?(p, pos, time) do
      upd = %{p | player: %{p.player | position: pos}, last_update: time}
      update_and_broadcast(s, uid, upd)
    else {:noreply, s} end
  end

  defp can_update?(%{last_update: nil}, _pos, _time), do: true

  defp can_update?(p, pos, time) do
    dt = (time - p.last_update) / 1000.0
    dist(p.player.position, pos) <= @max_speed_ms * dt
  end

  defp update_and_broadcast(s, uid, p) do
    ps = Map.put(s.players, uid, p)
    broadcast_state_update(s.sector_id, ps)
    {:noreply, %{s | players: ps}}
  end

  defp build_payload(s) do
    %GameState{
      game_time: s.game_time,
      players: players_to_list(s.players),
      terrain: s.terrain || %Mutonex.Engine.Entities.Terrain{},
      fauna: fauna_to_list(s.fauna),
      minerals: s.minerals,
      conveyors: s.conveyors,
      items: s.items,
      buildings: s.buildings
    }
  end

  defp dist(p1, p2) do
    dx = :math.pow(p1.x - p2.x, 2)
    dy = :math.pow(p1.y - p2.y, 2)
    dz = :math.pow(p1.z - p2.z, 2)
    :math.sqrt(dx + dy + dz)
  end

  defp players_to_list(ps) do
    Enum.map(ps, fn {_, %{player: p}} ->
      [
        p.id, p.position.x, p.position.y, p.position.z,
        p.attributes.charm, p.inventory, p.energy, p.status
      ]
    end)
  end

  defp fauna_to_list(fs) do
    Enum.map(fs, fn {_, f} ->
      [f.id, f.position.x, f.position.y, f.position.z, f.energy, f.status]
    end)
  end

  defp buildings_to_list(bs) do
    Enum.map(bs, fn b ->
      [b.id, b.position.x, b.position.y, b.position.z, b.type, b.energy, b.status]
    end)
  end

  defp broadcast_state_update(sid, ps, items \\ nil, buildings \\ nil, fauna \\ nil) do
    payload = %{players: players_to_list(ps)}
    payload = if items, do: Map.put(payload, :items, items), else: payload
    payload = if buildings, do: Map.put(payload, :buildings, buildings_to_list(buildings)), else: payload
    payload = if fauna, do: Map.put(payload, :fauna, fauna_to_list(fauna)), else: payload
    Endpoint.broadcast("game:#{sid}", "state_update", payload)
  end

  defp add_player_if_missing(s, uid) do
    if s.players[uid] do
      s
    else
      p = %Unit{
        id: uid,
        type: :head,
        position: %{x: 0, y: 1, z: 0}
      }
      %{s | players: Map.put(s.players, uid, %{
        player: p,
        last_update: nil
      })}
    end
  end

  defp should_process?(v, ph) do
    (v in [:ok, :expired] or not message_token_enabled?()) &&
      ph == :gamein
  end

  defp message_token_enabled? do
    Application.get_env(
      :mutonex_server,
      :webclient_message_token_enabled,
      false
    )
  end

  defp sync_tokens(s, u, v) do
    if v == :ok, do: s, else: update_tokens(s, u, v)
  end

  defp update_tokens(s, u, v) do
    if p = s.players[u] do
      u_upd = %{p.player |
        expired_token_count: inc_if(p.player.expired_token_count, v == :expired),
        invalid_token_count: inc_if(p.player.invalid_token_count, v == :invalid)
      }
      %{s | players: Map.put(s.players, u, %{p | player: u_upd})}
    else
      s
    end
  end

  defp inc_if(count, true), do: count + 1
  defp inc_if(count, _), do: count

  defp validate_token_internal(s, uid, token) do
    t = s.tokens[uid]
    MessageToken.verify(token, t[:current], t[:previous])
  end

  defp schedule_token_rotation do
    Process.send_after(self(), :rotate_tokens, 10000)
  end

  defp via_tuple(sid) do
    {:via, Registry, {Mutonex.GameRegistry, sid}}
  end
end
