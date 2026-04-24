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

  test "verify/3 handles current, previous, and invalid" do
    curr = "token-a"
    prev = "token-b"
    assert MessageToken.verify(curr, curr, prev) == :ok
    assert MessageToken.verify(prev, curr, prev) == :expired
    assert MessageToken.verify("bad", curr, prev) == :invalid
  end
end
