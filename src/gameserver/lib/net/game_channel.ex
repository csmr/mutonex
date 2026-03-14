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
    GenServer.cast(pid, {:player_joined, uid, self()})

    {:ok, socket}
  end

  @doc "Handles the private session token push."
  def handle_info({:new_token, token}, socket) do
    push(socket, "new_token", %{token: token})
    {:noreply, socket}
  end

  def handle_info({:after_join, data}, socket) do
    user_id = Map.get(socket.assigns, :user_id)
    push(socket, "game_phase", %{phase: data.phase, user_id: user_id})
    push(socket, "game_state", data.game_state)
    {:noreply, socket}
  end

  @doc "Handles a move event from a client."
  def handle_in("avatar_update", payload, socket) do
    user_id = socket.assigns.user_id
    sector_id = get_sector_id(socket)
    via = via_session(sector_id)

    {token, inner_payload} =
      case payload do
        %{"session_message_token" => t, "payload" => p} -> {t, p}
        _ -> {nil, payload}
      end

    GenServer.cast(via, {:avatar_update, user_id, inner_payload, token})

    {:noreply, socket}
  end

  # --- Private Helpers ---

  defp via_session(sector_id) do
    registry = Mutonex.GameRegistry
    {:via, Registry, {registry, sector_id}}
  end

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
