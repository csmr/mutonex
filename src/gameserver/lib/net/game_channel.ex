defmodule Mutonex.Net.GameChannel do
  use Phoenix.Channel
  alias Mutonex.Engine.GameSession

  @doc """
  Handles a player joining a game sector channel.
  """
  def join("game:" <> sector_id, _payload, socket) do
    # Find or start the GameSession process
    {:ok, pid} = start_game_session(sector_id)

    # Fetch initial state from the session
    initial_data = GameSession.get_initial_state(pid)

    # Send initial state push async after join
    send(self(), {:after_join, initial_data})

    # Notify GameSession that a player joined
    uid = Map.get(socket.assigns, :user_id, "guest")
    GenServer.cast(pid, {:player_joined, uid})

    {:ok, socket}
  end

  @doc "Handles the async push of initial state after join."
  def handle_info({:after_join, data}, socket) do
    push(socket, "game_phase", %{phase: data.phase})
    push(socket, "game_state", data.game_state)
    {:noreply, socket}
  end

  @doc "Handles a move event from a client."
  def handle_in("avatar_update", payload, socket) do
    sector_id = get_sector_id(socket)
    user_id = socket.assigns.user_id

    # Cast the event to the GameSession GenServer
    registry = Mutonex.GameRegistry
    via = {:via, Registry, {registry, sector_id}}
    GenServer.cast(via, {:avatar_update, user_id, payload})

    {:noreply, socket}
  end

  # --- Private Helpers ---

  defp get_sector_id(socket) do
    socket.topic |> String.split(":") |> Enum.at(1)
  end

  defp start_game_session(sector_id) do
    registry = Mutonex.GameRegistry
    via = {:via, Registry, {registry, sector_id}}

    case GenServer.whereis(via) do
      nil ->
        spec = {GameSession, sector_id}
        sup = Mutonex.GameSessionSupervisor
        DynamicSupervisor.start_child(sup, spec)

      pid when is_pid(pid) ->
        {:ok, pid}
    end
  end
end
