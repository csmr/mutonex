defmodule Mutonex.Utils.MessageToken do
  @moduledoc """
  Utilities for generating and managing session message tokens.
  """

  @doc "Generates a random message token using 32 bytes of entropy."
  def generate do
    :crypto.strong_rand_bytes(32)
    |> Base.url_encode64()
  end
end
