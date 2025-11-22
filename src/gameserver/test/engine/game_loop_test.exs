defmodule Engine.GameLoopTest do
  use ExUnit.Case

  import Mox

  setup_all do
    {:ok, pid} = start_supervised({Engine.GameLoop, [start_ticking: false]})
    on_exit(fn -> Process.exit(pid, :kill) end)
    :ok
  end

  test "game loop starts and can be found" do
    assert is_pid(Process.whereis(Engine.GameLoop))
  end

  test "game loop fetches planet state for all active sectors on tick" do
    pid = Process.whereis(Engine.GameLoop)
    Mox.allow(Engine.SimtellusClientMock, self(), pid)

    expect(Engine.SimtellusClientMock, :get_planet_state, 3, fn _lat, _lon ->
      {:ok, %Tesla.Env{status: 200, body: %{"temperature" => 25.0}}}
    end)

    pid = Process.whereis(Engine.GameLoop)
    send(pid, :tick)
    Engine.GameLoop.sync(pid)
  end

  test "game loop logs an error when simtellus call fails" do
    pid = Process.whereis(Engine.GameLoop)
    Mox.allow(Engine.SimtellusClientMock, self(), pid)

    expect(Engine.SimtellusClientMock, :get_planet_state, 3, fn _lat, _lon ->
      {:error, "a network error"}
      end)

    # Capture the log output to verify the error is logged
    log_output =
      ExUnit.CaptureLog.capture_log(fn ->
        send(pid, :tick)
        Engine.GameLoop.sync(pid)
      end)

    # Assert that the error message was logged
    assert log_output =~ "Failed to fetch planet state"
  end

  test "game loop logs an error when simtellus returns a non-200 response" do
    pid = Process.whereis(Engine.GameLoop)
    Mox.allow(Engine.SimtellusClientMock, self(), pid)

    expect(Engine.SimtellusClientMock, :get_planet_state, 3, fn _lat, _lon ->
      {:error, {:non_2xx_status, 403, "Host not permitted"}}
      end)

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
