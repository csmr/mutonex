defmodule Mutonex.Engine.GameSession do
  use GenServer
  require Logger
  alias Mutonex.Engine.Entities.{Unit, GameState}
  alias Mutonex.Engine.TerrainGenerator
  alias Mutonex.Engine.SparseOctree
  alias Mutonex.Engine.Mineral, as: MineralLogic
  alias Mutonex.Net.Endpoint
  alias Mutonex.Engine.SimtellusClient
  alias Mutonex.Engine.Systems.FaunaSystem
  alias Mutonex.Utils.MessageToken

  # 2.0 units/s (1 unit=1km) is 2 km/s = 7200 km/h.
  @max_speed_kmh 8000
  @max_speed_ms (@max_speed_kmh * 1000 / 3600)

  # --- Client API ---

  def start_link(sector_id) do
    name = via_tuple(sector_id)
    GenServer.start_link(__MODULE__, sector_id, name: name)
  end

  def get_initial_state(pid) do
    GenServer.call(pid, :get_initial_state)
  end

  # --- GenServer Callbacks ---

  def init(sector_id) do
    state = %{
      sector_id: sector_id,
      players: %{},
      tokens: %{}, # %{uid => %{current: "...", previous: "..."}}
      terrain: nil,
      game_time: 720,
      phase: :booting, # Wait for Simtellus
      fauna: %{},
      octree: nil,
      minerals: [],
      conveyors: [],
      buildings: [],
      pending_start: false
    }

    send(self(), :check_simtellus)
    schedule_token_rotation()
    {:ok, state}
  end

  def handle_call(:get_initial_state, _from, state) do
    fauna =
      if state.octree do
        fauna_to_list(state.fauna)
      else
        []
      end

    terrain =
      state.terrain || %Mutonex.Engine.Entities.Terrain{}

    game_state = %GameState{
      game_time: state.game_time,
      players: players_to_list(state.players),
      terrain: terrain,
      fauna: fauna,
      minerals: state.minerals,
      conveyors: state.conveyors,
      buildings: state.buildings
    }

    response = %{
      phase: Atom.to_string(state.phase),
      game_state: game_state
    }

    {:reply, response, state}
  end

  def handle_info(:rotate_tokens, state) do
    new_tokens =
      Enum.into(state.players, %{}, fn {uid, _} ->
        old_data = Map.get(state.tokens, uid, %{})
        new_token = generate_token()

        if pid = Map.get(old_data, :pid) do
          push_token(pid, new_token)
        end

        {uid,
         %{
           current: new_token,
           previous: Map.get(old_data, :current),
           pid: Map.get(old_data, :pid)
         }}
      end)

    schedule_token_rotation()
    {:noreply, %{state | tokens: new_tokens}}
  end

  def handle_info(:check_simtellus, state) do
    client =
      Application.get_env(
        :mutonex_server,
        :simtellus_client,
        SimtellusClient
      )

    case client.is_available?() do
      true ->
        Logger.info("Simtellus available.")

        if state.pending_start do
          start_game_session(state)
        else
          Logger.info("Moving to Lobby.")
          topic = "game:#{state.sector_id}"
          msg = %{phase: "lobby"}
          Endpoint.broadcast(topic, "game_phase", msg)
          {:noreply, %{state | phase: :lobby}}
        end

      false ->
        Process.send_after(self(), :check_simtellus, 1000)
        {:noreply, state}
    end
  end

  def handle_info({:tick_fauna, id}, state) do
    case state.phase do
      :gamein ->
        {fauna, octree} =
          FaunaSystem.process_tick(state, id)

        {:noreply, %{state | fauna: fauna, octree: octree}}

      _ ->
        {:noreply, state}
    end
  end

  def handle_cast({:player_joined, uid, pid}, state) do
    state = add_player_if_missing(state, uid)
    token = generate_token()
    push_token(pid, token)

    new_tokens =
      Map.put(
        state.tokens,
        uid,
        %{current: token, previous: nil, pid: pid}
      )

    state = %{state | tokens: new_tokens}

    case state.phase do
      :lobby ->
        Logger.info("Player joined. Initializing...")
        start_game_session(state)

      :booting ->
        Logger.info("Player joined during boot. Queuing...")
        {:noreply, %{state | pending_start: true}}

      :gamein ->
        Logger.info("Player joined existing game.")
        broadcast_state_update(state.sector_id, state.players)
        {:noreply, state}

      _ ->
        {:noreply, state}
    end
  end

  def handle_cast({:avatar_update, uid, data, token}, state) do
    validation = validate_token_internal(state, uid, token)

    case should_process_message?(validation) do
      true ->
        do_avatar_update(uid, data, state, validation)

      false ->
        state =
          update_state_with_validation(state, uid, validation)

        {:noreply, state}
    end
  end

  # --- Private Helpers ---

  defp validate_token_internal(state, uid, token) do
    tokens = Map.get(state.tokens, uid, %{})

    cond do
      token == tokens[:current] -> :ok
      token == tokens[:previous] -> :expired
      true -> :invalid
    end
  end

  defp should_process_message?(validation) do
    validation in [:ok, :expired] or
      not message_token_enabled?()
  end

  defp message_token_enabled? do
    Application.get_env(
      :mutonex_server,
      :webclient_message_token_enabled,
      false
    )
  end

  defp update_state_with_validation(state, _uid, :ok), do: state

  defp update_state_with_validation(state, uid, validation) do
    increment_token_count(state, uid, validation)
  end

  defp do_avatar_update(uid, pos_list, state, validation) do
    state = update_state_with_validation(state, uid, validation)

    case state.phase do
      :gamein ->
        [x, y, z] = pos_list
        time = System.os_time(:millisecond)
        pos = %{x: x, y: y, z: z}
        player = Map.get(state.players, uid)
        handle_player_update(player, uid, pos, time, state)

      _ ->
        {:noreply, state}
    end
  end

  defp schedule_token_rotation do
    Process.send_after(self(), :rotate_tokens, 10000)
  end

  defp generate_token do
    MessageToken.generate()
  end

  defp push_token(pid, token) do
    send(pid, {:new_token, token})
  end

  defp increment_token_count(state, uid, type) do
    case Map.get(state.players, uid) do
      nil -> state
      p_state -> do_increment_token_count(state, uid, p_state, type)
    end
  end

  defp do_increment_token_count(state, uid, p_state, type) do
    unit = p_state.player

    updated_unit =
      case type do
        :expired ->
          %{
            unit
            | expired_token_count:
                unit.expired_token_count + 1
          }

        :invalid ->
          %{
            unit
            | invalid_token_count:
                unit.invalid_token_count + 1
          }
      end

    new_p_state = %{p_state | player: updated_unit}
    new_players = Map.put(state.players, uid, new_p_state)
    %{state | players: new_players}
  end

  defp add_player_if_missing(state, uid) do
    if Map.has_key?(state.players, uid) do
      state
    else
      pos = %{x: 0.0, y: 1.0, z: 0.0}
      player = %Unit{id: uid, type: :head, position: pos}
      p_state = %{player: player, last_update: nil}
      %{state | players: Map.put(state.players, uid, p_state)}
    end
  end

  defp start_game_session(state) do
    new_state = build_environment_entities(state)
    payload = build_game_state_payload(new_state)
    broadcast_start(state.sector_id, payload)
    {:noreply, new_state}
  end

  defp build_environment_entities(state) do
    terrain = TerrainGenerator.generate_heightmap(20, 20)
    octree = SparseOctree.new({-50, -50, -50, 50, 50, 50})
    {fauna, octree2} = FaunaSystem.initialize(state.sector_id, 22, octree)
    minerals = MineralLogic.spawn_minerals(5, %{x: 20, z: 20})
    players = add_default_dummy_units(state.players)
    %{state | phase: :gamein, terrain: terrain, octree: octree2,
              fauna: fauna, minerals: minerals, players: players, pending_start: false}
  end

  defp add_default_dummy_units(players) do
    ts = System.os_time(:millisecond)
    dp = %Unit{id: "dummy_player_alpha", type: :head, position: %{x: 5.0, y: 1.0, z: -5.0}, attributes: %{charm: 10, tribe: :potassium, flavor: :red}}
    npc = %Unit{id: "npc_charmable_beta", type: :follower, position: %{x: -5.0, y: 1.0, z: 5.0}, is_charmable: true, attributes: %{charm: 5, tribe: :helium, flavor: :cyan}}
    players
    |> Map.put(dp.id, %{player: dp, last_update: ts})
    |> Map.put(npc.id, %{player: npc, last_update: ts})
  end

  defp build_game_state_payload(state) do
    %GameState{
      game_time: state.game_time,
      players: players_to_list(state.players),
      terrain: state.terrain,
      fauna: fauna_to_list(state.fauna),
      minerals: state.minerals,
      conveyors: state.conveyors,
      buildings: state.buildings
    }
  end

  defp broadcast_start(sector_id, game_state) do
    topic = "game:#{sector_id}"
    Endpoint.broadcast(topic, "game_phase", %{phase: "gamein"})
    Endpoint.broadcast(topic, "game_state", game_state)
  end

  defp handle_player_update(nil, uid, pos, time, state) do
    player = %Unit{id: uid, type: :head, position: pos}
    p_state = %{player: player, last_update: time}
    updated = Map.put(state.players, uid, p_state)
    broadcast_state_update(state.sector_id, updated)
    {:noreply, %{state | players: updated}}
  end

  defp handle_player_update(%{last_update: nil} = p_state, uid, pos, time, state) do
    updated_player = %{p_state.player | position: pos}
    new_p_state = %{player: updated_player, last_update: time}
    updated = Map.put(state.players, uid, new_p_state)
    broadcast_state_update(state.sector_id, updated)
    {:noreply, %{state | players: updated}}
  end

  defp handle_player_update(p_state, _, pos, time, state) do
    case is_move_valid?(p_state.player.position, pos, time - p_state.last_update) do
      true -> process_valid_move(p_state, pos, time, state)
      false -> {:noreply, state}
    end
  end

  defp process_valid_move(p_state, pos, time, state) do
    updated_player = %{p_state.player | position: pos}
    new_p_state = %{player: updated_player, last_update: time}
    updated = Map.put(state.players, updated_player.id, new_p_state)
    broadcast_state_update(state.sector_id, updated)
    {:noreply, %{state | players: updated}}
  end

  defp is_move_valid?(p1, p2, dt_ms) do
    dt_s = dt_ms / 1000.0
    distance(p1, p2) <= @max_speed_ms * dt_s
  end

  defp via_tuple(sector_id) do
    {:via, Registry, {Mutonex.GameRegistry, sector_id}}
  end

  defp distance(p1, p2) do
    dx = p1.x - p2.x
    dy = p1.y - p2.y
    dz = p1.z - p2.z
    :math.sqrt(dx * dx + dy * dy + dz * dz)
  end

  defp players_to_list(players_map) do
    Enum.map(players_map, fn {_, %{player: p}} ->
      [p.id, p.position.x, p.position.y, p.position.z, p.attributes.charm]
    end)
  end

  defp fauna_to_list(fauna_map) do
    Enum.map(fauna_map, fn {_, f} ->
      [f.id, f.position.x, f.position.y, f.position.z]
    end)
  end

  defp broadcast_state_update(sector_id, players_map) do
    list = players_to_list(players_map)
    topic = "game:#{sector_id}"
    msg = %{players: list}
    Endpoint.broadcast(topic, "state_update", msg)
  end
end
