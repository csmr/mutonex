defmodule Mutonex.Engine.TerrainGeneratorTest do
  use ExUnit.Case, async: true
  alias Mutonex.Engine.TerrainGenerator

  test "generate_heightmap/2 returns a terrain struct with correct dimensions and data" do
    width = 20
    height = 20
    terrain = TerrainGenerator.generate_heightmap(width, height)

    assert %Mutonex.Engine.Entities.Terrain{} = terrain
    assert terrain.size == %{width: width, height: height}
    assert length(terrain.data) == height
    assert length(hd(terrain.data)) == width

    # Check that the median of the terrain data is 0
    flat_list = Enum.flat_map(terrain.data, & &1)
    sorted = Enum.sort(flat_list)
    median = Enum.at(sorted, div(length(sorted), 2))
    assert median == 0
  end
end
