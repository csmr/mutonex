defmodule Mutonex.Utils.MessageTokenTest do
  use ExUnit.Case, async: true
  alias Mutonex.Utils.MessageToken

  test "generate/0 returns a non-empty string" do
    token = MessageToken.generate()
    assert is_binary(token)
    assert String.length(token) > 0
  end

  test "generate/0 returns different tokens" do
    token1 = MessageToken.generate()
    token2 = MessageToken.generate()
    assert token1 != token2
  end
end
