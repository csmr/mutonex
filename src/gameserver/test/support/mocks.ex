defmodule Mutonex.TestMocks do
  import Mox

  # Define the mock module.
  # This file is compiled in :test environment via test/support path.
  defmock(Mutonex.Engine.SimtellusClientMock, for: Mutonex.Engine.SimtellusClientBehaviour)
end
