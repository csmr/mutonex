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

  # Speed limit: 2.0 units/s (at 1 unit=1km) is 2 km/s = 7200 km/h.
  # Set limit high to allow this "fast travel" mode.
  # Coordinate System: 1 unit = 1 km.
  @max_speed_kmh 8000
  @max_speed_ms (@max_speed_kmh * 1000 / 3600)

  # --- Client API ---
  def start_link(sector_id) do
    GenServer.start_link(__MODULE__, sector_id, name: via_tuple(sector_id))
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
      phase: :booting, # Start in booting to wait for Simtellus
      fauna: %{}, # Map of id -> Fauna struct
      octree: nil,
      minerals: [],
      conveyors: [],
      buildings: [],
      pending_start: false # Track if player joined during boot
    }

    # Start checking for Simtellus availability
    send(self(), :check_simtellus)

    {:ok, state}
  end

  def handle_call(:get_initial_state, _from, state) do
    # Handle fauna: if nil/empty, return empty list
    fauna_list = if state.octree, do: fauna_to_list(state.fauna), else: []

    game_state = %GameState{
      game_time: state.game_time,
      players: players_to_list(state.players),
      terrain: state.terrain || %Mutonex.Engine.Entities.Terrain{}, # Safe default
      fauna: fauna_list,
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
    # Use configured client to allow mocking in tests
    client = Application.get_env(:mutonex_server, :simtellus_client, SimtellusClient)

    case client.is_available?() do
      true ->
        Logger.info("Simtellus available.")
        if state.pending_start do
          start_game_session(state)
        else
          Logger.info("Moving to Lobby.")
          Endpoint.broadcast("game:" <> state.sector_id, "game_phase", %{phase: "lobby"})
          {:noreply, %{state | phase: :lobby}}
        end

      false ->
        # Logger.info("Waiting for Simtellus...") # noisy
        Process.send_after(self(), :check_simtellus, 1000)
        {:noreply, state}
    end
  end

  def handle_info({:tick_fauna, fauna_id}, %{phase: :gamein} = state) do
    {new_fauna, new_octree} = FaunaSystem.process_tick(state, fauna_id)
    {:noreply, %{state | fauna: new_fauna, octree: new_octree}}
  end

  def handle_info({:tick_fauna, _}, state) do
    # Ignore ticks if not in gamein phase
    {:noreply, state}
  end

  def handle_cast({:player_joined, _user_id}, %{phase: :lobby} = state) do
    Logger.info("Player joined. Starting game initialization...")
    start_game_session(state)
  end

  def handle_cast({:player_joined, _user_id}, %{phase: :booting} = state) do
    Logger.info("Player joined during boot. Queuing start...")
    {:noreply, %{state | pending_start: true}}
  end

  def handle_cast({:player_joined, _}, state) do
    {:noreply, state}
  end

  def handle_cast({:avatar_update, user_id, [x, y, z]}, %{phase: :gamein} = state) do
    current_time = System.os_time(:millisecond)
    new_position = %{x: x, y: y, z: z}
    player_state = Map.get(state.players, user_id)
    handle_player_update(player_state, user_id, new_position, current_time, state)
  end

  def handle_cast({:avatar_update, _user_id, _pos}, state) do
    # Ignore moves in other phases
    {:noreply, state}
  end

  # --- Private Helpers ---

  defp start_game_session(state) do
    # Generate Terrain
    terrain = TerrainGenerator.generate_heightmap(20, 20)
    octree = SparseOctree.new({0, 0, 0, 20, 20, 20}) # Explicit bounds tuple

    # Initialize Fauna via System
    {fauna, octree} = FaunaSystem.initialize(state.sector_id, 4, octree)

    # Spawn minerals (Legacy feature preserved)
    minerals = MineralLogic.spawn_minerals(5, %{x: 20, z: 20})

    new_state = %{state |
      phase: :gamein,
      terrain: terrain,
      octree: octree,
      fauna: fauna,
      minerals: minerals,
      pending_start: false
    }

    # Create GameState struct for broadcast
    game_state = %GameState{
      game_time: state.game_time,
      players: players_to_list(state.players),
      terrain: terrain,
      fauna: fauna_to_list(fauna),
      minerals: minerals,
      conveyors: state.conveyors,
      buildings: state.buildings
    }

    Endpoint.broadcast("game:" <> state.sector_id, "game_phase", %{phase: "gamein"})
    Endpoint.broadcast("game:" <> state.sector_id, "game_state", game_state)
    {:noreply, new_state}
  end

  defp handle_player_update(nil, user_id, pos, time, state) do
    # New player
    new_player_state = %{
      player: %Player{id: user_id, position: pos},
      last_update: time
    }
    updated_players = Map.put(state.players, user_id, new_player_state)
    broadcast_state_update(state.sector_id, updated_players)
    {:noreply, %{state | players: updated_players}}
  end

  defp handle_player_update(%{player: p, last_update: t}, _, pos, time, state) do
    # Existing player
    if is_move_valid?(p.position, pos, time - t) do
      updated_player = %{p | position: pos}
      new_player_state = %{player: updated_player, last_update: time}
      updated_players = Map.put(state.players, p.id, new_player_state)
      broadcast_state_update(state.sector_id, updated_players)
      {:noreply, %{state | players: updated_players}}
    else
      IO.puts("Invalid move for #{p.id}")
      {:noreply, state}
    end
  end

  defp is_move_valid?(p1, p2, time_delta_ms) do
    time_delta_s = time_delta_ms / 1000.0
    dist = distance(p1, p2)
    dist <= @max_speed_ms * time_delta_s
  end

  defp via_tuple(sector_id), do: {:via, Registry, {Mutonex.GameRegistry, sector_id}}

  defp distance(p1, p2) do
    dx = p1.x - p2.x
    dy = p1.y - p2.y
    dz = p1.z - p2.z
    :math.sqrt(dx*dx + dy*dy + dz*dz)
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
    player_lists = players_to_list(players_map)
    Endpoint.broadcast("game:" <> sector_id, "state_update", %{players: player_lists})
  end
end
