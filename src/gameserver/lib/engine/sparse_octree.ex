defmodule Mutonex.Engine.SparseOctree do
  import Bitwise
  defstruct node: nil, bounds: nil, entities: [], children: nil, capacity: 4

  @default_capacity 4

  def new(bounds, capacity \\ @default_capacity) do
    %__MODULE__{bounds: bounds, entities: [], capacity: capacity}
  end

  def insert(%__MODULE__{children: nil, entities: ents} = node, entity) do
    if length(ents) < node.capacity do
      %{node | entities: [entity | ents]}
    else
      node
      |> subdivide()
      |> move_entities_to_children()
      |> insert_into_child(entity)
    end
  end

  def insert(%__MODULE__{} = node, entity), do: insert_into_child(node, entity)

  defp move_entities_to_children(node) do
    new_node = Enum.reduce(node.entities, node, &insert_into_child(&2, &1))
    %{new_node | entities: []}
  end

  defp insert_into_child(node, entity) do
    index = get_octant_index(node.bounds, entity)
    updated_child = insert(Enum.at(node.children, index), entity)
    %{node | children: List.replace_at(node.children, index, updated_child)}
  end

  defp subdivide(node) do
    {min_x, min_y, min_z, max_x, max_y, max_z} = bounds_to_tuple(node.bounds)
    mid = {(min_x + max_x) / 2, (min_y + max_y) / 2, (min_z + max_z) / 2}

    children =
      for i <- 0..7 do
        bounds = get_child_bounds({min_x, min_y, min_z, max_x, max_y, max_z}, mid, i)
        new(bounds, node.capacity)
      end

    %{node | children: children}
  end

  defp get_child_bounds({min_x, min_y, min_z, max_x, max_y, max_z}, {mx, my, mz}, idx) do
    {
      if((idx &&& 1) == 0, do: min_x, else: mx),
      if((idx &&& 2) == 0, do: min_y, else: my),
      if((idx &&& 4) == 0, do: min_z, else: mz),
      if((idx &&& 1) == 0, do: mx, else: max_x),
      if((idx &&& 2) == 0, do: my, else: max_y),
      if((idx &&& 4) == 0, do: mz, else: max_z)
    }
  end

  defp get_octant_index(bounds, %{x: x, y: y, z: z}) do
    {min_x, min_y, min_z, max_x, max_y, max_z} = bounds_to_tuple(bounds)
    mid_x = (min_x + max_x) / 2
    mid_y = (min_y + max_y) / 2
    mid_z = (min_z + max_z) / 2

    (if x >= mid_x, do: 1, else: 0) |||
      (if y >= mid_y, do: 2, else: 0) |||
      (if z >= mid_z, do: 4, else: 0)
  end

  def remove(node, id), do: remove_recursive(node, id)

  defp remove_recursive(%{children: nil} = node, id) do
    %{node | entities: Enum.reject(node.entities, &(&1.id == id))}
  end

  defp remove_recursive(node, id) do
    %{node | children: Enum.map(node.children, &remove_recursive(&1, id))}
  end

  def remove_by_position(node, entity), do: remove_by_position(node, entity, entity)

  def remove_by_position(%{children: nil} = node, %{id: id}, _pos) do
    %{node | entities: Enum.reject(node.entities, &(&1.id == id))}
  end

  def remove_by_position(node, entity, pos) do
    idx = get_octant_index(node.bounds, normalize_pos(pos))
    child = remove_by_position(Enum.at(node.children, idx), entity, pos)
    %{node | children: List.replace_at(node.children, idx, child)}
  end

  def update(node, old, new) do
    node
    |> remove_by_position(old, old)
    |> insert(new)
  end

  def query_range(node, pos, rad) do
    pos = normalize_pos(pos)
    if intersects?(node.bounds, pos, rad) do
      do_query(node, pos, rad)
    else
      []
    end
  end

  defp do_query(%{children: nil} = node, pos, rad) do
    Enum.filter(node.entities, &(distance(&1, pos) <= rad))
  end

  defp do_query(node, pos, rad) do
    Enum.flat_map(node.children, &query_range(&1, pos, rad))
  end

  defp intersects?(bounds, %{x: px, y: py, z: pz}, rad) do
    {min_x, min_y, min_z, max_x, max_y, max_z} = bounds_to_tuple(bounds)
    cx = max(min_x, min(px, max_x))
    cy = max(min_y, min(py, max_y))
    cz = max(min_z, min(pz, max_z))
    sq_dist(px - cx, py - cy, pz - cz) < rad * rad
  end

  defp distance(%{x: x1, y: y1, z: z1}, %{x: x2, y: y2, z: z2}) do
    :math.sqrt(sq_dist(x1 - x2, y1 - y2, z1 - z2))
  end

  defp sq_dist(dx, dy, dz), do: dx * dx + dy * dy + dz * dz

  defp normalize_pos({x, y, z}), do: %{x: x, y: y, z: z}
  defp normalize_pos(map), do: map

  defp bounds_to_tuple(t) when is_tuple(t), do: t
  defp bounds_to_tuple(l), do: List.to_tuple(l)
end
