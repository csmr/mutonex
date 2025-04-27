defmodule SparseOctree do
  defstruct node: nil, bounds: nil, entities: [], children: nil

  @capacity 4 # Maximum number of entities per node before subdividing

  def new(bounds) do
    %SparseOctree{bounds: bounds, entities: []}
  end

  def insert(%SparseOctree{} = node, entity) do
    if length(node.entities) < @capacity and is_nil(node.children) do
      %SparseOctree{node | entities: [entity | node.entities]}
    else
      if is_nil(node.children) do
        node = subdivide(node)
      end

      index = get_octant_index(node.bounds, entity)
      child = Enum.at(node.children, index)
      updated_child = insert(child, entity)
      %SparseOctree{node | children: Enum.replace_at(node.children, index, updated_child)}
    end
  end

  defp subdivide(%SparseOctree{} = node) do
    bounds = node.bounds
    half = {(Enum.at(bounds, 0) + Enum.at(bounds, 3)) / 2, (Enum.at(bounds, 1) + Enum.at(bounds, 4)) / 2, (Enum.at(bounds, 2) + Enum.at(bounds, 5)) / 2}

    children = Enum.map(0..7, fn i ->
      child_bounds = get_child_bounds(bounds, half, i)
      new(child_bounds)
    end)

    %SparseOctree{node | children: children}
  end

  defp get_child_bounds(bounds, half, index) do
    x = if index & 0b001 == 0, do: Enum.at(bounds, 0), else: half[0]
    y = if index & 0b010 == 0, do: Enum.at(bounds, 1), else: half[1]
    z = if index & 0b100 == 0, do: Enum.at(bounds, 2), else: half[2]

    [x, y, z, half[0], half[1], half[2]]
  end

  defp get_octant_index(bounds, entity) do
    mid_x = (Enum.at(bounds, 0) + Enum.at(bounds, 3)) / 2
    mid_y = (Enum.at(bounds, 1) + Enum.at(bounds, 4)) / 2
    mid_z = (Enum.at(bounds, 2) + Enum.at(bounds, 5)) / 2

    index = 0
    index = index | (if entity.x > mid_x, do: 0b001, else: 0)
    index = index | (if entity.y > mid_y, do: 0b010, else: 0)
    index = index | (if entity.z > mid_z, do: 0b100, else: 0)

    index
  end
end

