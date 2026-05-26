defmodule Mutonex.Engine.GameSessionTest do
  # Use async: false because of global Mox mock
  use ExUnit.Case, async: false
  alias Mutonex.Engine.GameSession
  import Mox

  setup :verify_on_exit!

  setup do
    # Allow any process to call mock
    set_mox_global(Mutonex.Engine.SimtellusClientMock)

    # Configure the application to use the mock
    env = [
      {:mutonex_server, :simtellus_client,
       Mutonex.Engine.SimtellusClientMock}
    ]

    Enum.each(env, fn {app, key, val} ->
      Application.put_env(app, key, val)
    end)

    sector_id = "test_sector_#{System.unique_integer()}"
    {:ok, sector_id: sector_id}
  end

  test "starts in :booting phase", %{sector_id: sid} do
    Mutonex.Engine.SimtellusClientMock
    |> expect(:is_available?, fn -> false end)

    {:ok, pid} = GameSession.start_link(sid)

    state = :sys.get_state(pid)
    assert state.phase == :booting
  end

  test "transitions to :lobby", %{sector_id: sid} do
    Mutonex.Engine.SimtellusClientMock
    |> stub(:is_available?, fn -> true end)

    {:ok, pid} = GameSession.start_link(sid)
    wait_for_phase(pid, :lobby)
  end

  test "transitions to :gamein on join", %{sector_id: sid} do
    Mutonex.Engine.SimtellusClientMock
    |> stub(:is_available?, fn -> true end)

    {:ok, pid} = GameSession.start_link(sid)
    wait_for_phase(pid, :lobby)

    GenServer.cast(pid, {:player_joined, "user1", self()})
    wait_for_phase(pid, :gamein)

    state = :sys.get_state(pid)
    assert state.terrain != nil

    # Verify unified Unit struct is handled immediately on join
    player_state = Map.get(state.players, "user1")
    assert player_state != nil
    unit = player_state.player
    assert unit.__struct__ == Mutonex.Engine.Entities.Unit
    assert unit.type == :head
    assert unit.attributes.charm == 1
  end

  test "queues start during boot", %{sector_id: sid} do
    Mutonex.Engine.SimtellusClientMock
    |> expect(:is_available?, fn -> false end)

    {:ok, pid} = GameSession.start_link(sid)

    # Check it's booting
    state = :sys.get_state(pid)
    assert state.phase == :booting

    # Player joins while booting
    GenServer.cast(pid, {:player_joined, "user1", self()})

    state = :sys.get_state(pid)
    assert state.pending_start == true

    Mutonex.Engine.SimtellusClientMock
    |> expect(:is_available?, fn -> true end)

    # Force check
    send(pid, :check_simtellus)
    wait_for_phase(pid, :gamein)
  end

  test "charm action updates target society and flag", %{sector_id: sid} do
    Mutonex.Engine.SimtellusClientMock
    |> stub(:is_available?, fn -> true end)

    {:ok, pid} = GameSession.start_link(sid)
    wait_for_phase(pid, :lobby)

    # Add the player, which initiates the start phase
    GenServer.cast(pid, {:player_joined, "charm_caster", self()})
    wait_for_phase(pid, :gamein)

    # Force the positions so the distance check passes
    pos = %{x: 0.0, y: 1.0, z: 0.0}
    GenServer.cast(pid, {:avatar_update, "charm_caster", [pos.x, pos.y, pos.z], "mock_token"})
    
    # Cast the charm payload (targeting the default dummy npc that's spawned close by)
    GenServer.cast(pid, {:player_action, "charm_caster", "charm", "npc_charmable_beta", nil})
    
    # Process sleep for genserver
    Process.sleep(50)

    state = :sys.get_state(pid)
    target_state = Map.get(state.players, "npc_charmable_beta")
    
    # Verify the state mutated correctly
    assert target_state.player.is_charmable == false
    assert target_state.player.society_id == "charm_caster"
  end

  test "drop action with metadata applies offset", %{sector_id: sid} do
    Mutonex.Engine.SimtellusClientMock |> stub(:is_available?, fn -> true end)
    {:ok, pid} = GameSession.start_link(sid)
    wait_for_phase(pid, :lobby)

    # Joined player starts with empty inventory, let's give them something
    GenServer.cast(pid, {:player_joined, "dropper", self()})
    wait_for_phase(pid, :gamein)

    # Initial pickup to put item in inventory
    GenServer.cast(pid, {:player_action, "dropper", "pick_up", "item_gem_01", nil})
    Process.sleep(50)

    # Drop with forward vector {1, 0, 0}
    meta = %{"x" => 1.0, "y" => 0.0, "z" => 0.0}
    GenServer.cast(pid, {:player_action, "dropper", "drop_item", "item_gem_01", meta})
    Process.sleep(50)

    state = :sys.get_state(pid)
    item = Enum.find(state.items, &(&1.id == "item_gem_01"))
    
    # Player initial pos is (0, 1, 0). With offset (1, 0, 0) -> (1, 1, 0)
    assert item.position == %{x: 1.0, y: 1.0, z: 0.0}
  end

  defp wait_for_phase(pid, expected_phase, retries \\ 10) do
    state = :sys.get_state(pid)

    if state.phase == expected_phase do
      assert state.phase == expected_phase
    else
      if retries > 0 do
        Process.sleep(50)
        wait_for_phase(pid, expected_phase, retries - 1)
      else
        flunk("Got #{state.phase}, expected #{expected_phase}")
      end
    end
  end
end
