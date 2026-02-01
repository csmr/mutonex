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

    GenServer.cast(pid, {:player_joined, "user1"})
    wait_for_phase(pid, :gamein)

    state = :sys.get_state(pid)
    assert state.terrain != nil
  end

  test "queues start during boot", %{sector_id: sid} do
    Mutonex.Engine.SimtellusClientMock
    |> expect(:is_available?, fn -> false end)

    {:ok, pid} = GameSession.start_link(sid)

    # Check it's booting
    state = :sys.get_state(pid)
    assert state.phase == :booting

    # Player joins while booting
    GenServer.cast(pid, {:player_joined, "user1"})

    state = :sys.get_state(pid)
    assert state.pending_start == true

    Mutonex.Engine.SimtellusClientMock
    |> expect(:is_available?, fn -> true end)

    # Force check
    send(pid, :check_simtellus)
    wait_for_phase(pid, :gamein)
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
