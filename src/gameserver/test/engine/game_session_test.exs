defmodule Mutonex.Engine.GameSessionTest do
  use ExUnit.Case, async: true
  alias Mutonex.Engine.GameSession
  alias Mutonex.Engine.SimtellusClientBehaviour
  import Mox

  # Define mock behavior
  setup :verify_on_exit!

  # Note: Mox.defmock(Mutonex.Engine.SimtellusClientMock, ...) is already defined in test_helper.exs

  setup do
    # Allow any process to call the mock (avoids race conditions with GenServer init)
    Mox.set_mox_global(Mutonex.Engine.SimtellusClientMock)

    # Configure the application to use the mock
    Application.put_env(:mutonex_server, :simtellus_client, Mutonex.Engine.SimtellusClientMock)

    sector_id = "test_sector_#{System.unique_integer()}"
    {:ok, sector_id: sector_id}
  end

  test "starts in :booting phase and waits for simtellus", %{sector_id: sector_id} do
    # Simtellus is down initially
    Mutonex.Engine.SimtellusClientMock
    |> expect(:is_available?, fn -> false end)

    {:ok, pid} = GameSession.start_link(sector_id)

    # Initially it should be booting
    state = :sys.get_state(pid)
    assert state.phase == :booting
  end

  test "transitions to :lobby when simtellus is available", %{sector_id: sector_id} do
    Mutonex.Engine.SimtellusClientMock
    |> stub(:is_available?, fn -> true end)

    {:ok, pid} = GameSession.start_link(sector_id)

    # Allow some time for the message to be processed
    # Using :sys.get_state is synchronous but doesn't wait for internal msgs unless we sync.
    # We can't easily sync on handle_info.
    # So we loop briefly.

    wait_for_phase(pid, :lobby)
  end

  test "transitions to :gamein when player joins from lobby", %{sector_id: sector_id} do
    Mutonex.Engine.SimtellusClientMock
    |> stub(:is_available?, fn -> true end)

    {:ok, pid} = GameSession.start_link(sector_id)
    wait_for_phase(pid, :lobby)

    GenServer.cast(pid, {:player_joined, "user1"})

    wait_for_phase(pid, :gamein)

    state = :sys.get_state(pid)
    assert state.terrain != nil
  end

  test "queues start if player joins during boot", %{sector_id: sector_id} do
    # Simtellus down first
    Mutonex.Engine.SimtellusClientMock
    |> expect(:is_available?, fn -> false end)

    {:ok, pid} = GameSession.start_link(sector_id)

    # Check it's booting
    state = :sys.get_state(pid)
    assert state.phase == :booting

    # Player joins while booting
    GenServer.cast(pid, {:player_joined, "user1"})

    state = :sys.get_state(pid)
    assert state.pending_start == true

    # Now make simtellus available for the NEXT call.
    # We need to update the expectation or stub.
    # Since we used `expect` (once), the next call will fail if not defined.
    # So we define the next one.
    Mutonex.Engine.SimtellusClientMock
    |> expect(:is_available?, fn -> true end)

    # Force the check now instead of waiting 1000ms
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
        flunk("Expected phase #{expected_phase} but got #{state.phase}")
      end
    end
  end
end
