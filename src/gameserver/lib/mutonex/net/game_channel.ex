defmodule Mutonex.Net.GameChannel do
  use Phoenix.Channel
  alias Mutonex.Engine.GameSession

  @doc """
  Handles a player joining a specific game sector channel.
  Finds or starts the corresponding GameSession GenServer.
  """
  def join("game:" <> sector_id, _payload, socket) do
    # Find or start the GameSession process for this sector_id
    {:ok, _pid} = start_game_session(sector_id)

    # Subscribe to broadcasts for this game session
    # Mutonex.PubSub.subscribe("game:#{sector_id}")

    {:ok, socket}
  end

  @doc """
  Handles a "move" event from a client.
  Casts the event to the GameSession GenServer for processing.
  """
  def handle_in("move", payload, socket) do
    sector_id = get_sector_id(socket)
    user_id = socket.assigns.user_id

    # The channel is stateless; it finds the game session process via the registry
    # and sends it a message. The GenServer handles the game logic.
    {:via, Registry, {Mutonex.GameRegistry, sector_id}}
    |> GenServer.cast({:move, user_id, payload})

    {:noreply, socket}
  end

  # --- Private Helpers ---

  defp get_sector_id(socket) do
    # Extracts the sector_id from the channel topic
    # "game:sector_id" -> "sector_id"
    socket.topic |> String.split(":") |> Enum.at(1)
  end

  defp start_game_session(sector_id) do
    # Use the Registry to avoid starting duplicate processes.
    # If a process is already registered for this sector_id, it returns its pid.
    # If not, it starts a new one via our DynamicSupervisor.
    Registry.find_or_create(Mutonex.GameRegistry, sector_id, fn ->
      spec = {GameSession, sector_id}
      {:ok, pid} = DynamicSupervisor.start_child(Mutonex.GameSessionSupervisor, spec)
      {:ok, pid}
    end)
  end
end
