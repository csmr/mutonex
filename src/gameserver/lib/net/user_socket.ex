defmodule Mutonex.Net.UserSocket do
  use Phoenix.Socket

  channel "game:*", Mutonex.Net.GameChannel

  def connect(_params, socket) do
    {:ok, assign(socket, :user_id, :guest)}
  end

  def id(socket), do: "user:#{socket.assigns.user_id}"
end
