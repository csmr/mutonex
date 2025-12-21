defmodule Mutonex.Net.GameChannel do
  use Phoenix.Channel
  alias Mutonex.Engine.GameSession

  @doc """
  Handles a player joining a specific game sector channel.
  Finds or starts the corresponding GameSession GenServer.
  """
  def join("game:" <> sector_id, _payload, socket) do
    # Find or start the GameSession process for this sector_id
    {:ok, pid} = start_game_session(sector_id)

    # Fetch initial state from the session
    initial_data = GameSession.get_initial_state(pid)

    # Subscribe to broadcasts for this game session
    # PubSub.subscribe("game:#{sector_id}")

    # Send the initial state push in a separate process after join completes
    send(self(), {:after_join, initial_data})
    {:ok, socket}
  end

  @doc """
  Handles the async push of initial state after join.
  """
  def handle_info({:after_join, data}, socket) do
    push(socket, "game_phase", %{phase: data.phase})
    push(socket, "game_state", data.game_state)
    {:noreply, socket}
  end

  @doc """
  Handles a "move" event from a client.
  Casts the event to the GameSession GenServer for processing.
  """
  def handle_in("avatar_update", payload, socket) do
    sector_id = get_sector_id(socket)
    user_id = socket.assigns.user_id

    # The channel is stateless; it finds the game session process via the registry
    # and sends it a message. The GenServer handles the game logic.
    {:via, Registry, {Mutonex.GameRegistry, sector_id}}
    |> GenServer.cast({:avatar_update, user_id, payload})

    {:noreply, socket}
  end

  # --- Private Helpers ---

  defp get_sector_id(socket) do
    socket.topic |> String.split(":") |> Enum.at(1)
  end

  defp start_game_session(sector_id) do
    via_tuple = {:via, Registry, {Mutonex.GameRegistry, sector_id}}

    case GenServer.whereis(via_tuple) do
      nil ->
        spec = {GameSession, sector_id}
        DynamicSupervisor.start_child(Mutonex.GameSessionSupervisor, spec)
      pid when is_pid(pid) ->
        {:ok, pid}
    end
  end
end
