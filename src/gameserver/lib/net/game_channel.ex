defmodule Net.GameChannel do
  use Phoenix.Channel

  def join("game:" <> sector_id, _payload, socket) do
    game_instance = Engine.GameInstance.new(sector_id)
    {:ok, assign(socket, :game_instance, game_instance)}
  end

  def handle_in("move", payload, socket) do
    game_instance = socket.assigns.game_instance
    user_id = socket.assigns.user_id
    {:ok, updated_instance} = Engine.GameInstance.handle_move(game_instance, user_id, payload)
    {:noreply, assign(socket, :game_instance, updated_instance)}
  end
end
