defmodule Mutonex.Engine.SparseOctreeTest do
  use ExUnit.Case, async: true
  alias Mutonex.Engine.SparseOctree

  describe "SparseOctree" do
    test "creates a new sparse octree" do
      bounds = {0, 0, 0, 100, 100, 100}
      octree = SparseOctree.new(bounds)

      assert octree.bounds == bounds
      assert octree.entities == []
      assert octree.children == nil
    end

    test "inserts an entity into the octree" do
      bounds = {0, 0, 0, 100, 100, 100}
      octree = SparseOctree.new(bounds)
      entity = %{id: "entity_1", x: 10, y: 20, z: 30}

      updated_octree = SparseOctree.insert(octree, entity)

      assert length(updated_octree.entities) == 1
      assert hd(updated_octree.entities) == entity
    end

    test "subdivides when capacity exceeded" do
      # Create a small octree with capacity 2
      bounds = {0, 0, 0, 100, 100, 100}
      octree = SparseOctree.new(bounds, 2) # max_items = 2

      # Insert 3 items
      e1 = %{id: "e1", x: 10, y: 10, z: 10}
      e2 = %{id: "e2", x: 60, y: 60, z: 60}
      e3 = %{id: "e3", x: 90, y: 90, z: 90}

      octree = octree
      |> SparseOctree.insert(e1)
      |> SparseOctree.insert(e2)
      |> SparseOctree.insert(e3)

      # Should be subdivided
      assert octree.children != nil
      assert octree.entities == [] # Entities should be pushed down

      # Check logic:
      # e1 (10,10,10) -> child index 0 (0-50 range)
      # e2 (60,60,60) -> child index 7 (50-100 range)
      # e3 (90,90,90) -> child index 7 (50-100 range)

      # We check that we can find them via query.
      # Querying from center {50,50,50} with radius 100 coverts the whole box.
      # Dist e1-center: sqrt(40^2*3) = 69.2
      # Dist e2-center: sqrt(10^2*3) = 17.3
      # Dist e3-center: sqrt(40^2*3) = 69.2

      found = SparseOctree.query_range(octree, {50,50,50}, 100.0)

      # Debug if needed:
      # IO.inspect(found, label: "Found entities")

      assert Enum.any?(found, fn e -> e.id == "e1" end)
      assert Enum.any?(found, fn e -> e.id == "e2" end)
      assert Enum.any?(found, fn e -> e.id == "e3" end)
      assert length(found) == 3
    end

    test "updates entity position" do
      bounds = {0, 0, 0, 100, 100, 100}
      octree = SparseOctree.new(bounds)
      e1 = %{id: "e1", x: 10, y: 10, z: 10}

      octree = SparseOctree.insert(octree, e1)

      # Move e1
      e1_moved = %{id: "e1", x: 60, y: 60, z: 60}
      octree = SparseOctree.update(octree, e1, e1_moved)

      found = SparseOctree.query_range(octree, {50,50,50}, 20.0)
      assert Enum.any?(found, fn e -> e.id == "e1" end)
      assert length(found) == 1
    end

    test "removes entity" do
       bounds = {0, 0, 0, 100, 100, 100}
       octree = SparseOctree.new(bounds)
       e1 = %{id: "e1", x: 10, y: 10, z: 10}
       octree = SparseOctree.insert(octree, e1)

       octree = SparseOctree.remove_by_position(octree, e1, {10,10,10})

       assert octree.entities == []
    end
  end
end
