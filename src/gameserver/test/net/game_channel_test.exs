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

  test "get_game_state event pushes a structured game state", %{socket: socket} do
    push(socket, "get_game_state", %{})

    assert_push "game_state", %Mutonex.Engine.Entities.GameState{
      game_time: 720,
      units: [
        %Mutonex.Engine.Entities.Unit{
          id: "u1",
          type: :head,
          position: %{x: 40.7128, y: -74.0060, z: 0},
          society_id: "s1"
        },
        %Mutonex.Engine.Entities.Unit{
          id: "u2",
          type: :chief,
          position: %{x: 34.0522, y: -118.2437, z: 0},
          society_id: "s2"
        }
      ],
      buildings: [
        %Mutonex.Engine.Entities.Building{
          id: "b1",
          type: :power_structure,
          position: %{x: 40.7128, y: -74.0060, z: 0},
          society_id: "s1"
        }
      ],
      societies: [
        %Mutonex.Engine.Entities.Society{id: "s1", player_id: "player1"},
        %Mutonex.Engine.Entities.Society{id: "s2", player_id: "player2"}
      ],
      minerals: [
        %Mutonex.Engine.Entities.Mineral{
          id: "m1",
          type: :iron,
          position: %{x: 51.5074, y: -0.1278, z: 0}
        }
      ]
    }
  end
end
