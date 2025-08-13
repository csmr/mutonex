defmodule Engine.GameInstanceTest do
  use ExUnit.Case, async: true
  alias Gameserver.Engine.GameInstance
  alias Gameserver.Engine.SparseOctree

  test "creates a new game instance" do
    sector_id = "sector_1"
    game_instance = GameInstance.new(sector_id)

    assert game_instance.sector_id == sector_id
    assert is_map(game_instance.scene_graph)
  end

  test "handles a move" do
    sector_id = "sector_1"
    game_instance = GameInstance.new(sector_id)
    user_id = "user_1"
    payload = %{"x" => 10, "y" => 20, "z" => 30}

    updated_instance = GameInstance.handle_move(game_instance, user_id, payload)

    assert updated_instance.scene_graph != game_instance.scene_graph
  end
end
