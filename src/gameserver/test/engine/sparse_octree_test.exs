defmodule Engine.SparseOctreeTest do
  use ExUnit.Case, async: true
  alias Gameserver.Engine.SparseOctree

  test "creates a new sparse octree" do
    bounds = {0, 0, 0, 100, 100, 100}
    octree = SparseOctree.new(bounds)

    assert octree.bounds == bounds
    assert octree.entities == []
    assert is_nil(octree.children)
  end

  test "inserts an entity into the octree" do
    bounds = {0, 0, 0, 100, 100, 100}
    octree = SparseOctree.new(bounds)
    entity = %{id: "entity_1", x: 10, y: 20, z: 30}

    updated_octree = SparseOctree.insert(octree, entity)

    assert length(updated_octree.entities) == 1
    assert hd(updated_octree.entities) == entity
  end
end

