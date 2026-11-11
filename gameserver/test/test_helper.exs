ExUnit.start()

# Start Mox for mocking in tests.
Application.ensure_all_started(:mox)

alias Mutonex.Engine.SimtellusClientMock
alias Mutonex.TestMocks.DefaultSimtellusStub
Mox.stub_with(SimtellusClientMock, DefaultSimtellusStub)
