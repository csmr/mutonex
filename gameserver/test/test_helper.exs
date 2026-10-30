ExUnit.start()

# Start Mox for mocking in tests.
Application.ensure_all_started(:mox)

Mox.stub_with(Mutonex.Engine.SimtellusClientMock, Mutonex.TestMocks.DefaultSimtellusStub)
