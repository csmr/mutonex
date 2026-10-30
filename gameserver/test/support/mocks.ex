defmodule Mutonex.TestMocks do
  import Mox

  defmock(Mutonex.Engine.SimtellusClientMock, for: Mutonex.Engine.SimtellusClientBehaviour)

  defmodule DefaultSimtellusStub do
    @behaviour Mutonex.Engine.SimtellusClientBehaviour
    def get_planet_state(_lat, _lon), do: {:ok, %{}}
    def get_artifacts(_lat, _lon), do: []
    def add_artifact(_lat, _lon, _art), do: :ok
    def get_fair_spawn_points(_lat, _lon, count) do
      Enum.map(1..count, fn i -> %{x: i * 20.0, y: 0.0, z: i * 20.0} end)
    end
    def is_available?, do: true
  end
end
