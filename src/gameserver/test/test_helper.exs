ExUnit.start()

# Start Mox for mocking in tests.
Application.ensure_all_started(:mox)

# Define mocks for any global modules
Mox.defmock(Engine.SimtellusClientMock, for: Engine.SimtellusClientBehaviour)
