defmodule Mutonex.Net.GameChannelTest do
  use ExUnit.Case, async: true
  import Phoenix.ChannelTest

  @endpoint Mutonex.Net.Endpoint

  alias Mutonex.Net.GameChannel
  alias Mutonex.Net.UserSocket

  # Define the Stub module outside of setup block to ensure it's available at compile time
  defmodule SimtellusClientStub do
    @behaviour Mutonex.Engine.SimtellusClientBehaviour
    def get_planet_state(_lat, _lon), do: {:ok, %{}}
    def is_available?, do: true
  end

  setup do
    # Mock SimtellusClient availability
    # Use verify_on_exit to ensure expectations are met (if any)
    Mox.stub(Mutonex.Engine.SimtellusClientMock, :is_available?, fn -> true end)

    # We need to allow the GameSession (started by GameChannel) to call the mock.
    # Mox is process-bound, so we must allow the global allowance or specific pids.
    # Since GameSession is a GenServer, we can't easily get its PID *before* it starts.
    # So we use set_mox_global or verify in test. But async: true makes global unsafe.
    # Solution: Use Mox.allow/3 if we can, or just set stub globally if possible?
    # Actually, async: true + Mox usually requires strict process ownership.
    # Let's try to pass the expectation to any process.
    Mox.stub_with(Mutonex.Engine.SimtellusClientMock, SimtellusClientStub)

    {:ok, _, socket} =
      socket(UserSocket, "user:guest", %{})
      |> subscribe_and_join(GameChannel, "game:lobby")

    %{socket: socket}
  end

  test "joining the channel pushes initial lobby phase and game state", %{socket: _socket} do
    # Verify initial phase is Lobby
    assert_push "game_phase", %{phase: "lobby"}

    # Verify Game State
    # Note: We match on the shape of the map pushed to the client, which is what assert_push expects.
    # The struct key is stripped by Phoenix serializer or test helper if not handled carefully,
    # but assert_push usually matches against the payload map.
    # Using a map pattern match instead of struct to avoid cyclic dependency in test compilation.
    assert_push "game_state", %{
      game_time: 720,
      players: [],
      terrain: %{
        size: %{width: 20, height: 20}
      }
    }

    # Verify transition to Gamein happens eventually (we won't wait 5s here, but logic is in GenServer)
    # If we wanted to test transition, we'd need to mock time or have a configurable delay.
  end
end
