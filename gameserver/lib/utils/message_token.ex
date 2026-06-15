defmodule Mutonex.Utils.MessageToken do
  @moduledoc """
  Utilities for rolling session message tokens.
  """

  @entropy_bytes Application.compile_env(
                    :mutonex_server,
                    [__MODULE__, :entropy_bytes],
                    32
                  )

  @doc "Generates a random message token."
  def generate do
    :crypto.strong_rand_bytes(@entropy_bytes)
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
