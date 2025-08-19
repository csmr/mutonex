defmodule Engine.GameLoopTest do
  use ExUnit.Case, async: true

  import Mox

  # It is standard practice to define mocks in the test_helper.exs file
  # so they are available globally. However, since my attempt to create that
  # file was part of a command that timed out, I will define the mock here
  # to be self-contained. If `test_helper.exs` was created successfully,
  # this line is redundant but harmless. If not, it is essential.
  Mox.defmock(SimtellusClientMock, for: Engine.SimtellusClient)

  # In tests, we need to explicitly set the mode for the mock.
  # This is usually done in config/test.exs, but I will do it here.
  setup do
    Mox.stub_with(SimtellusClientMock, Engine.SimtellusClient)
    :ok
  end

  test "game loop starts and can be found" do
    # Start the supervised process
    start_supervised!({Engine.GameLoop, []})
    # Check that the process is registered with the correct name
    assert is_pid(Process.whereis(Engine.GameLoop))
  end

  test "game loop fetches planet state for all active sectors on tick" do
    start_supervised!({Engine.GameLoop, []})

    # The GameLoop starts with 3 hardcoded sectors.
    # We expect the client to be called for each of them.
    expect(SimtellusClientMock, :get_planet_state, 3, fn _lat, _lon ->
      {:ok, %{body: %{"temperature" => 25.0}}}
    end)

    send(Process.whereis(Engine.GameLoop), :tick)
    Process.sleep(100) # Allow time for async processing
    verify!(SimtellusClientMock)
  end

  test "game loop logs an error when simtellus call fails" do
    start_supervised!({Engine.GameLoop, []})

    # Expect the client to be called and return an error for all 3 sectors
    expect(SimtellusClientMock, :get_planet_state, 3, fn _lat, _lon ->
      {:error, "a network error"}
    end)

    # Capture the log output to verify the error is logged
    log_output =
      ExUnit.CaptureLog.capture_log(fn ->
        send(Process.whereis(Engine.GameLoop), :tick)
        Process.sleep(100) # Allow time for async processing
      end)

    # Assert that the error message was logged
    assert log_output =~ "Failed to fetch planet state"

    verify!(SimtellusClientMock)
  end
end
