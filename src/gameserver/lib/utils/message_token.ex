defmodule Mutonex.Utils.MessageToken do
  @moduledoc """
  Utilities for rolling session message tokens.

  ## Parameters and Properties
  - **Entropy**: 32 bytes of cryptographically strong
    randomness, Base64 URL encoded.
  - **Rotation**: Tokens are regenerated every 10 seconds.
  - **Grace Period**: The previous token is kept for one
    additional cycle (total 10s grace).
  - **Latency Handling**: The dual-token approach allows
    up to 20 seconds of network delay before a message
    is rejected, making it suitable for high-latency
    connections like Starlink.
  """

  @doc "Generates a random message token."
  def generate do
    :crypto.strong_rand_bytes(32)
    |> Base.url_encode64()
  end

  @doc """
  Verifies a token against current and previous values.
  Returns :ok, :expired, or :invalid.
  """
  def verify(token, current, previous) do
    cond do
      token == current -> :ok
      token == previous -> :expired
      true -> :invalid
    end
  end
end
