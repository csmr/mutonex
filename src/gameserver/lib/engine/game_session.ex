defmodule Mutonex.Engine.GameSession do
  use GenServer
  alias Mutonex.Engine.Entities.{Player, GameState, Fauna}
  alias Mutonex.Engine.FaunaBehavior
  alias Mutonex.Engine.TerrainGenerator
  alias Mutonex.Engine.SparseOctree
  alias Mutonex.Engine.Mineral, as: MineralLogic
  alias Mutonex.Net.Endpoint

  # Speed limit: 2.0 units/s (at 1 unit=1km) is 2 km/s = 7200 km/h.
  # Set limit high to allow this "fast travel" mode.
  @max_speed_kmh 8000
  @max_speed_ms (@max_speed_kmh * 1000 / 3600)

  # --- Client API ---
  def start_link(sector_id), do: GenServer.start_link(__MODULE__, sector_id, name: via_tuple(sector_id))

  def get_initial_state(pid) do
    GenServer.call(pid, :get_initial_state)
  end

  # --- GenServer Callbacks ---
  def init(sector_id) do
    # Generate terrain once per session
    terrain = TerrainGenerator.generate_heightmap(20, 20)
    initial_players = %{}

    # Initialize Octree (20x20x20 bounds)
    octree = SparseOctree.new({0, 0, 0, 20, 20, 20})

    # Spawn initial fauna using behavior module
    fauna = FaunaBehavior.spawn(sector_id, 4)

    # Insert initial fauna into Octree
    # Store wrapper map as entity in Octree
    octree = Enum.reduce(fauna, octree, fn {_, f}, acc ->
      wrapper = %{x: f.position.x, y: f.position.y, z: f.position.z, id: f.id, type: :fauna}
      SparseOctree.insert(acc, wrapper)
    end)

    # Schedule tick for EACH fauna individually
    Enum.each(fauna, fn {id, _} -> schedule_fauna_tick(id) end)

    # Spawn minerals
    minerals = MineralLogic.spawn_minerals(5, %{x: 20, z: 20})

    state = %{
      sector_id: sector_id,
      players: initial_players,
      terrain: terrain,
      game_time: 720,
      phase: :lobby,
      fauna: fauna,
      octree: octree,
      minerals: minerals,
      conveyors: [],
      buildings: []
    }

    # Simulate lobby wait time
    Process.send_after(self(), :start_game, 5000)

    {:ok, state}
  end

  def handle_call(:get_initial_state, _from, state) do
    # Convert players map to list for client
    player_lists = Enum.map(state.players, fn {_, %{player: p}} ->
      [p.id, p.position.x, p.position.y, p.position.z]
    end)

    game_state = %GameState{
      game_time: state.game_time,
      players: player_lists,
      terrain: state.terrain,
      fauna: fauna_to_list(state.fauna),
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

  def handle_info(:start_game, state) do
    new_state = %{state | phase: :gamein}
    Endpoint.broadcast("game:" <> state.sector_id, "game_phase", %{phase: "gamein"})
    {:noreply, new_state}
  end

  # Handle individual fauna tick
  def handle_info({:tick_fauna, fauna_id}, state) do
    case Map.get(state.fauna, fauna_id) do
      nil -> {:noreply, state} # Fauna might have been removed
      current_fauna ->
        updated_fauna = FaunaBehavior.move(current_fauna)
        new_fauna_map = Map.put(state.fauna, fauna_id, updated_fauna)

        # Update Octree
        # We must use the exact same wrapper structure as inserted/previous update
        old_wrapper = %{x: current_fauna.position.x, y: current_fauna.position.y, z: current_fauna.position.z, id: current_fauna.id, type: :fauna}
        new_wrapper = %{x: updated_fauna.position.x, y: updated_fauna.position.y, z: updated_fauna.position.z, id: updated_fauna.id, type: :fauna}

        new_octree = SparseOctree.update(state.octree, old_wrapper, new_wrapper)

        # Pilot: Query Octree for players within range (e.g., 50km/units)
        # Just to verify functionality
        _nearby = SparseOctree.query_range(new_octree, new_wrapper, 50)
        # IO.inspect(nearby, label: "Entities near moving fauna #{fauna_id}")

        # Broadcast only this fauna update
        # We pass a map to `broadcast_fauna_update`, which calls `fauna_to_list`, which converts it to `[[id, x, y, z]]`.
        # The broadcast sends `%{fauna: [[id, x, y, z]]}` which matches Client expectation.
        broadcast_fauna_update(state.sector_id, %{fauna_id => updated_fauna})

        # Schedule next tick for THIS fauna
        schedule_fauna_tick(fauna_id)

        {:noreply, %{state | fauna: new_fauna_map, octree: new_octree}}
    end
  end

  def handle_cast({:avatar_update, user_id, [x, y, z]}, %{phase: :gamein} = state) do
    current_time = System.os_time(:millisecond)
    new_position = %{x: x, y: y, z: z}

    player_state = Map.get(state.players, user_id)

    handle_player_update(player_state, user_id, new_position, current_time, state)
  end

  def handle_cast({:avatar_update, _user_id, _pos}, %{phase: :lobby} = state) do
    # Ignore moves in lobby
    {:noreply, state}
  end

  # --- Private Helpers ---
  defp handle_player_update(nil, user_id, pos, time, state) do
    # New player
    new_player_state = %{player: %Player{id: user_id, position: pos}, last_update: time}
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

  defp schedule_fauna_tick(fauna_id) do
    Process.send_after(self(), {:tick_fauna, fauna_id}, FaunaBehavior.tick_delay())
  end

  defp fauna_to_list(fauna_map) do
    Enum.map(fauna_map, fn {_, f} ->
      [f.id, f.position.x, f.position.y, f.position.z]
    end)
  end

  defp broadcast_state_update(sector_id, players_map) do
    player_lists = Enum.map(players_map, fn {_, %{player: p}} ->
      [p.id, p.position.x, p.position.y, p.position.z]
    end)
    Endpoint.broadcast("game:" <> sector_id, "state_update", %{players: player_lists})
  end

  defp broadcast_fauna_update(sector_id, fauna_map) do
    fauna_lists = fauna_to_list(fauna_map)
    Endpoint.broadcast("game:" <> sector_id, "fauna_update", %{fauna: fauna_lists})
  end
end
