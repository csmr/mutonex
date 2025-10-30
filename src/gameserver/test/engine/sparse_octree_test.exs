defmodule Gameserver.Engine.SparseOctreeTest do
  alias Gameserver.Engine.SparseOctree

  defp test(description, test_fun) do
    if test_fun.() do
      IO.puts(">> #{description} pass: true")
      :ok
    else
      IO.puts(">> #{description} pass: false")
      :fail
    end
  end

  defp check(condition) do
    condition
  end

  def run_all_tests do
    IO.puts("Testrun for #{__MODULE__}")

    results = [
      test("creates a new sparse octree", fn ->
        bounds = {0, 0, 0, 100, 100, 100}
        octree = SparseOctree.new(bounds)

        check(octree.bounds == bounds) &&
        check(octree.entities == []) &&
        check(is_nil(octree.children))
      end),

      test("inserts an entity into the octree", fn ->
        bounds = {0, 0, 0, 100, 100, 100}
        octree = SparseOctree.new(bounds)
        entity = %{id: "entity_1", x: 10, y: 20, z: 30}

        updated_octree = SparseOctree.insert(octree, entity)

        check(length(updated_octree.entities) == 1) &&
        check(hd(updated_octree.entities) == entity)
      end)
    ]

    all_passed = Enum.all?(results, fn status -> status == :ok end)
    if all_passed do
      IO.puts("\nSuper! Tests pass.")
    else
      IO.puts("\nFail!!! Test(s) not passing.")
      System.halt(1)
    end
  end
end

# Run the tests
Gameserver.Engine.SparseOctreeTest.run_all_tests()
