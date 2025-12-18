defmodule Mutonex.Engine.GameSession do
  use GenServer
  alias Mutonex.Engine.Entities.Player
  alias Mutonex.Net.Endpoint

  # Increased speed limit to accommodate client-side 120 units/s (approx 432 km/h)
  @max_speed_kmh 500
  @max_speed_ms (@max_speed_kmh * 1000 / 3600)

  # --- Client API ---
  def start_link(sector_id), do: GenServer.start_link(__MODULE__, sector_id, name: via_tuple(sector_id))

  # --- GenServer Callbacks ---
  def init(sector_id) do
    initial_state = %{sector_id: sector_id, players: %{}}
    {:ok, initial_state}
  end

  def handle_cast({:avatar_update, user_id, [x, y, z]}, state) do
    current_time = System.os_time(:millisecond)
    new_position = %{x: x, y: y, z: z}

    player_state = Map.get(state.players, user_id)

    handle_player_update(player_state, user_id, new_position, current_time, state)
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

  defp broadcast_state_update(sector_id, players_map) do
    player_lists = Enum.map(players_map, fn {_, %{player: p}} ->
      [p.id, p.position.x, p.position.y, p.position.z]
    end)
    Endpoint.broadcast("game:" <> sector_id, "state_update", %{players: player_lists})
  end
end
