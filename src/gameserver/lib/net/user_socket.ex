defmodule Mutonex.Net.UserSocket do
  use Phoenix.Socket

  channel "game:*", Mutonex.Net.GameChannel

  def connect(%{"token" => _token}, socket) do
    {:ok, assign(socket, :user_id, :guest)}
  end

  def connect(_params, _socket) do
    {:error, %{reason: "unauthorized"}}
  end

  def id(socket), do: "user:#{socket.assigns.user_id}"
end
