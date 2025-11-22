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
    # PubSub.subscribe("game:#{sector_id}")

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

  def handle_in("get_game_state", _payload, socket) do
    # Hardcoded game state for the PoC
    game_state = %Mutonex.Engine.Entities.GameState{
      game_time: 720,
      units: [
        %Mutonex.Engine.Entities.Unit{
          id: "u1",
          type: :head,
          position: %{x: 40.7128, y: -74.0060, z: 0},
          society_id: "s1"
        },
        %Mutonex.Engine.Entities.Unit{
          id: "u2",
          type: :chief,
          position: %{x: 34.0522, y: -118.2437, z: 0},
          society_id: "s2"
        }
      ],
      buildings: [
        %Mutonex.Engine.Entities.Building{
          id: "b1",
          type: :power_structure,
          position: %{x: 40.7128, y: -74.0060, z: 0},
          society_id: "s1"
        }
      ],
      societies: [
        %Mutonex.Engine.Entities.Society{id: "s1", player_id: "player1"},
        %Mutonex.Engine.Entities.Society{id: "s2", player_id: "player2"}
      ],
      minerals: [
        %Mutonex.Engine.Entities.Mineral{
          id: "m1",
          type: :iron,
          position: %{x: 51.5074, y: -0.1278, z: 0}
        }
      ]
    }

    push(socket, "game_state", game_state)
    {:noreply, socket}
  end

  # --- Private Helpers ---

  defp get_sector_id(socket) do
    # Extracts the sector_id from the channel topic
    # "game:sector_id" -> "sector_id"
    socket.topic |> String.split(":") |> Enum.at(1)
  end

  defp start_game_session(sector_id) do
    # Use via_tuple for robustly finding or starting the GenServer.
    # This is the recommended approach for dynamically supervised processes.
    via_tuple = {:via, Registry, {Mutonex.GameRegistry, sector_id}}

    # Check if the process is already alive.
    if GenServer.whereis(via_tuple) do
      {:ok, via_tuple}
    else
      # If not, start it.
      spec = {GameSession, sector_id}
      DynamicSupervisor.start_child(Mutonex.GameSessionSupervisor, spec)
    end
  end
end
