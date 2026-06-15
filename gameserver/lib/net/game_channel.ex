defmodule Mutonex.Net.GameChannel do
  use Phoenix.Channel
  alias Mutonex.Engine.GameSession

  @doc """
  Handles a player joining a game sector channel.
  """
  def join("game:" <> sector_id, _payload, socket) do
    uid = Map.get(socket.assigns, :user_id, "guest")
    {:ok, pid} = start_game_session(sector_id)
    initial_data = GameSession.get_initial_state(pid)

    # Send initial state push async after join
    send(self(), {:after_join, initial_data})

    # Notify GameSession that a player joined
    GenServer.cast(pid, {:player_joined, uid, self()})

    {:ok, socket}
  end

  @doc "Handles the private session token push."
  def handle_info({:new_token, token}, socket) do
    push(socket, "new_token", %{token: token})
    {:noreply, socket}
  end

  def handle_info({:after_join, data}, socket) do
    uid = Map.get(socket.assigns, :user_id, "guest")
    push(socket, "game_phase", %{phase: data.phase, user_id: uid})
    push(socket, "game_state", data.game_state)
    {:noreply, socket}
  end

  @doc "Handles a move event from a client."
  def handle_in("avatar_update", payload, socket) do
    user_id = Map.get(socket.assigns, :user_id, "guest")
    via = via_session(get_sector_id(socket))
    {token, inner_payload} = extract_token_and_payload(payload)

    GenServer.cast(
      via,
      {:avatar_update, user_id, inner_payload, token}
    )

    {:noreply, socket}
  end

  def handle_in("player_action", payload, socket) do
    %{"action" => action, "target_id" => target_id} = payload
    user_id = Map.get(socket.assigns, :user_id, "guest")
    via = via_session(get_sector_id(socket))
    meta = Map.get(payload, "metadata")

    GenServer.cast(
      via,
      {:player_action, user_id, action, target_id, meta}
    )

    {:noreply, socket}
  end

  # --- Private Helpers ---

  defp extract_token_and_payload(payload) do
    case payload do
      %{"session_message_token" => t, "payload" => p} -> {t, p}
      _ -> {nil, payload}
    end
  end

  defp via_session(sector_id) do
    {:via, Registry, {Mutonex.GameRegistry, sector_id}}
  end

  defp get_sector_id(socket) do
    socket.topic |> String.split(":") |> Enum.at(1)
  end

  defp start_game_session(sector_id) do
    via = via_session(sector_id)

    case GenServer.whereis(via) do
      nil ->
        spec = {GameSession, sector_id}
        DynamicSupervisor.start_child(Mutonex.GameSessionSupervisor, spec)

      pid when is_pid(pid) ->
        {:ok, pid}
    end
  end
end
