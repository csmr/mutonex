defmodule Mutonex.Net.UserSocket do
  use Phoenix.Socket

  channel "game:*", Mutonex.Net.GameChannel

  def connect(%{"token" => token}, socket) do
    case verify_token(token) do
      {:ok, user_id} ->
        {:ok, assign(socket, :user_id, user_id)}
      {:error, reason} ->
        {:error, %{reason: reason}}
    end
  end

  def connect(_params, _socket) do
    {:error, %{reason: "unauthorized"}}
  end

  def id(socket), do: "user:#{socket.assigns.user_id}"

  defp verify_token(token) do
    # Implement actual token verification logic
    # Example: case JWT.decode(token, your_secret_key) do
    #   {:ok, %{"user_id" => user_id}} -> {:ok, user_id}
    #   {:error, _reason} -> {:error, "invalid_token"}
    # end
    {:ok, :guest} # Placeholder: always return guest user
  end
end
