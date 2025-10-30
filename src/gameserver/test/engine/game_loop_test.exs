defmodule Engine.GameLoopTest do
  use ExUnit.Case, async: false

  import Mox

  Mox.defmock(SimtellusClientMock, for: Engine.SimtellusClientBehaviour)

  setup do
    Mox.verify_on_exit!(self())
    Application.put_env(:mutonex_server, :simtellus_client, SimtellusClientMock)
    {:ok, pid} = start_supervised({Engine.GameLoop, [start_ticking: false]})
    Mox.allow(SimtellusClientMock, self(), pid)
    on_exit(fn -> Process.exit(pid, :kill) end)
    :ok
  end

  test "game loop starts and can be found" do
    assert is_pid(Process.whereis(Engine.GameLoop))
  end

  test "game loop fetches planet state for all active sectors on tick" do
    expect(SimtellusClientMock, :get_planet_state, 3, fn _lat, _lon ->
      {:ok, %{body: %{"temperature" => 25.0}}}
    end)

    pid = Process.whereis(Engine.GameLoop)
    send(pid, :tick)
    Engine.GameLoop.sync(pid)
  end

  test "game loop logs an error when simtellus call fails" do
    expect(SimtellusClientMock, :get_planet_state, 3, fn _lat, _lon ->
      {:error, "a network error"}
    end)

    pid = Process.whereis(Engine.GameLoop)

    # Capture the log output to verify the error is logged
    log_output =
      ExUnit.CaptureLog.capture_log(fn ->
        send(pid, :tick)
        Engine.GameLoop.sync(pid)
      end)

    # Assert that the error message was logged
    assert log_output =~ "Failed to fetch planet state"
  end
end
