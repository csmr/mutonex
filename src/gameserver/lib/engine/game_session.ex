defmodule Mutonex.Engine.GameSession do
  use GenServer
  require Logger
  alias Mutonex.Engine.Entities.{Player, GameState}
  alias Mutonex.Engine.TerrainGenerator
  alias Mutonex.Engine.SparseOctree
  alias Mutonex.Engine.Mineral, as: MineralLogic
  alias Mutonex.Net.Endpoint
  alias Mutonex.Engine.SimtellusClient
  alias Mutonex.Engine.Systems.FaunaSystem

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

  def handle_cast({:player_joined, _}, state) do
    case state.phase do
      :lobby ->
        Logger.info("Player joined. Initializing...")
        start_game_session(state)

      :booting ->
        Logger.info("Player joined during boot. Queuing...")
        {:noreply, %{state | pending_start: true}}

      _ ->
        {:noreply, state}
    end
  end

  def handle_cast({:avatar_update, uid, pos_list}, state) do
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

  # --- Private Helpers ---

  defp start_game_session(state) do
    terrain = TerrainGenerator.generate_heightmap(20, 20)
    octree = SparseOctree.new({0, 0, 0, 20, 20, 20})

    {fauna, octree} =
      FaunaSystem.initialize(state.sector_id, 4, octree)

    minerals =
      MineralLogic.spawn_minerals(5, %{x: 20, z: 20})

    new_state = %{
      state
      | phase: :gamein,
        terrain: terrain,
        octree: octree,
        fauna: fauna,
        minerals: minerals,
        pending_start: false
    }

    game_state = %GameState{
      game_time: state.game_time,
      players: players_to_list(state.players),
      terrain: terrain,
      fauna: fauna_to_list(fauna),
      minerals: minerals,
      conveyors: state.conveyors,
      buildings: state.buildings
    }

    topic = "game:#{state.sector_id}"
    msg = %{phase: "gamein"}
    Endpoint.broadcast(topic, "game_phase", msg)
    Endpoint.broadcast(topic, "game_state", game_state)
    {:noreply, new_state}
  end

  defp handle_player_update(nil, uid, pos, time, state) do
    player = %Player{id: uid, position: pos}
    p_state = %{player: player, last_update: time}
    updated = Map.put(state.players, uid, p_state)
    broadcast_state_update(state.sector_id, updated)
    {:noreply, %{state | players: updated}}
  end

  defp handle_player_update(p_state, _, pos, time, state) do
    %{player: player, last_update: last_time} = p_state

    if is_move_valid?(
         player.position,
         pos,
         time - last_time
       ) do
      updated_player = %{player | position: pos}
      new_p_state = %{
        player: updated_player,
        last_update: time
      }
      updated = Map.put(
        state.players,
        player.id,
        new_p_state
      )
      broadcast_state_update(state.sector_id, updated)
      {:noreply, %{state | players: updated}}
    else
      {:noreply, state}
    end
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
      [p.id, p.position.x, p.position.y, p.position.z]
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
