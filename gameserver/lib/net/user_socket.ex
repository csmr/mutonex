defmodule Mutonex.Net.UserSocket do
  use Phoenix.Socket

  channel "game:*", Mutonex.Net.GameChannel

  def connect(_params, socket) do
    user_id = Base.encode16(:crypto.strong_rand_bytes(8))
    {:ok, assign(socket, :user_id, user_id)}
  end

  def id(socket), do: "user:#{socket.assigns.user_id}"
end
