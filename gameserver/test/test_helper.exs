ExUnit.start()

# Start Mox for mocking in tests.
Application.ensure_all_started(:mox)

# Define default stubs for global mock
Mox.stub(Mutonex.Engine.SimtellusClientMock, :get_artifacts, fn _lat, _lon -> [] end)
Mox.stub(Mutonex.Engine.SimtellusClientMock, :add_artifact, fn _lat, _lon, _art -> :ok end)
