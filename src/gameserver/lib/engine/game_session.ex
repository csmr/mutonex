defmodule Mutonex.Engine.GameSession do
  use GenServer

  alias Mutonex.Engine.SparseOctree

  # --- Client API ---

  @doc """
  Starts a new GameSession GenServer.
  """
  def start_link(sector_id) do
    GenServer.start_link(__MODULE__, sector_id, name: via_tuple(sector_id))
  end

  # --- GenServer Callbacks ---

  @doc """
  Initializes the GameSession state.
  """
  def init(sector_id) do
    # TODO: The bounds should eventually come from the sector's definition.
    bounds = {0, 0, 0, 10_000, 10_000, 10_000} # Using a larger, more realistic bound for a sector

    # In the future, this is where we would load persistent state (relics, minerals, etc.)
    # for this sector from the simtellus server API.
    initial_state = %{
      sector_id: sector_id,
      players: %{},
      societies: %{},
      units: %{},
      buildings: %{},
      minerals: %{},
      scene_graph: SparseOctree.new(bounds)
    }
    {:ok, initial_state}
  end

  def handle_cast({:move, user_id, payload}, state) do
    # This is where the game logic from the old GameInstance.handle_move goes.
    # It updates the state of the game session in response to a player move.
    entity = %{id: user_id, x: payload["x"], y: payload["y"], z: payload["z"]}
    updated_scene_graph = SparseOctree.insert(state.scene_graph, entity)

    new_state = %{state | scene_graph: updated_scene_graph}

    # TODO: Here we would broadcast the state change to all subscribed clients
    # PubSub.broadcast("game:" <> state.sector_id, "game_state_update", new_state)

    {:noreply, new_state}
  end

  # --- Private Helpers ---

  defp via_tuple(sector_id) do
    {:via, Registry, {Mutonex.GameRegistry, sector_id}}
  end
end
