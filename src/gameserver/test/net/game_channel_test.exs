defmodule Mutonex.Net.GameChannelTest do
  use ExUnit.Case, async: true
  import Phoenix.ChannelTest

  @endpoint Mutonex.Net.Endpoint

  alias Mutonex.Net.GameChannel
  alias Mutonex.Net.UserSocket

  setup do
    {:ok, _, socket} =
      socket(UserSocket, "user:guest", %{})
      |> subscribe_and_join(GameChannel, "game:lobby")

    %{socket: socket}
  end

  test "joining the channel pushes initial lobby phase and game state", %{socket: _socket} do
    alias Mutonex.Engine.Entities.{GameState, Terrain}

    # Verify initial phase is Lobby
    assert_push "game_phase", %{phase: "lobby"}

    # Verify Game State
    assert_push "game_state", %GameState{
      game_time: 720,
      players: [],
      terrain: %Terrain{
        size: %{width: 20, height: 20},
        data: _data
      }
    }

    # Verify transition to Gamein happens eventually (we won't wait 5s here, but logic is in GenServer)
    # If we wanted to test transition, we'd need to mock time or have a configurable delay.
  end
end
