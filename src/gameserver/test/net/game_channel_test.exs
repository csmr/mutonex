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

  test "joining the channel transitions through lobby to gamein and pushes initial state", %{socket: _socket} do
    alias Mutonex.Engine.Entities.{GameState, Terrain}

    # Verify transition to Lobby
    assert_push "game_phase", %{phase: "lobby"}

    # Verify transition to Gamein
    assert_push "game_phase", %{phase: "gamein"}

    # Verify Game State
    # Note: Jason not used here, so we check for lists which we manually created
    assert_push "game_state", %GameState{
      game_time: 720,
      players: [
        ["player1", 10, 10, 0],
        ["player2", 20, 15, 0]
      ],
      terrain: %Terrain{
        size: %{width: 20, height: 20},
        data: _data
      }
    }
  end
end
