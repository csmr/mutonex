defmodule Mutonex.Net.MessageTokenIntegrationTest do
  use ExUnit.Case, async: false
  import Phoenix.ChannelTest
  alias Mutonex.Net.GameChannel
  alias Mutonex.Net.UserSocket

  @endpoint Mutonex.Net.Endpoint

  setup do
    # Enable validation for testing
    Application.put_env(:mutonex_server, :webclient_message_token_enabled, true)
    on_exit(fn ->
      Application.put_env(:mutonex_server, :webclient_message_token_enabled, false)
    end)

    try do
      Mox.set_mox_global(Mutonex.Engine.SimtellusClientMock)
    rescue
      _ -> :ok
    end
    Mox.stub(Mutonex.Engine.SimtellusClientMock, :is_available?, fn -> true end)

    uid = "test_user_" <> Base.encode16(:crypto.strong_rand_bytes(4))
    {:ok, _, socket} =
      socket(UserSocket, "user:#{uid}", %{user_id: uid})
      |> subscribe_and_join(GameChannel, "game:integration_test")

    # Wait for the initial token
    assert_push "new_token", %{token: token}

    %{socket: socket, uid: uid, token: token}
  end

  test "message with valid token is processed", %{socket: socket, uid: uid, token: token} do
    push(socket, "avatar_update", %{
      "session_message_token" => token,
      "payload" => [10.0, 1.0, 10.0]
    })

    # Since it's a cast on the server, we check for a broadcast/push of updated state
    # GameSession broadcasts state_update
    Enum.find_value(1..10, fn _ ->
      assert_broadcast "state_update", %{players: players}
      if Enum.any?(players, fn [id, x, y, z, _, _, _, _] ->
        id == uid && x == 10.0 && y == 1.0 && z == 10.0
      end), do: true, else: false
    end) || flunk("Update not found")
  end

  test "message with invalid token is ignored and tracked", %{socket: socket, uid: uid} do
    push(socket, "avatar_update", %{
      "session_message_token" => "wrong_token",
      "payload" => [20.0, 1.0, 20.0]
    })

    # It should NOT be broadcast with the updated position
    refute_broadcast "state_update", %{players: [[^uid, 20.0, 1.0, 20.0, 0, [], 100.0, :active]]}

    # Verify invalid_token_count increased
    via = {:via, Registry, {Mutonex.GameRegistry, "integration_test"}}
    state = :sys.get_state(via)
    p_state = Map.get(state.players, uid)
    assert p_state.player.invalid_token_count == 1
  end

  test "expired token (grace period) is processed and tracked", %{socket: socket, uid: uid, token: old_token} do
    # Trigger rotation manually in GameSession
    via = {:via, Registry, {Mutonex.GameRegistry, "integration_test"}}
    send(GenServer.whereis(via), :rotate_tokens)

    # Receive new token
    assert_push "new_token", %{token: _new_token}

    # Use old_token (should be in 'previous')
    push(socket, "avatar_update", %{
      "session_message_token" => old_token,
      "payload" => [30.0, 1.0, 30.0]
    })

    # Should be processed
    Enum.find_value(1..10, fn _ ->
      assert_broadcast "state_update", %{players: players}
      if Enum.any?(players, fn [id, x, y, z, _, _, _, _] ->
        id == uid && x == 30.0 && y == 1.0 && z == 30.0
      end), do: true, else: false
    end) || flunk("Update not found")

    # Verify expired_token_count increased
    state = :sys.get_state(via)
    p_state = Map.get(state.players, uid)
    assert p_state.player.expired_token_count == 1
  end
end
