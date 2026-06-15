defmodule Mutonex.Engine.SparseOctree do
  import Bitwise
  alias __MODULE__, as: Octree
  defstruct [
    node: nil,
    bounds: nil,
    entities: [],
    children: nil,
    capacity: 4,
    depth: 0
  ]

  @default_capacity 4
  @max_depth 8

  def new(bounds, capacity \\ @default_capacity, depth \\ 0) do
    %Octree{
      bounds: bounds,
      entities: [],
      capacity: capacity,
      depth: depth
    }
  end

  def insert(%Octree{} = node, entity) do
    if is_nil(node.children) do
      maybe_subdivide_and_insert(node, entity)
    else
      insert_into_child(node, entity)
    end
  end

  defp maybe_subdivide_and_insert(node, entity) do
    if length(node.entities) < node.capacity or
         node.depth >= @max_depth do
      %Octree{node | entities: [entity | node.entities]}
    else
      node
      |> subdivide()
      |> move_entities_to_children()
      |> insert_into_child(entity)
    end
  end

  defp move_entities_to_children(node) do
    new_node =
      Enum.reduce(node.entities, node, fn e, acc ->
        insert_into_child(acc, e)
      end)

    %Octree{new_node | entities: []}
  end

  defp insert_into_child(node, entity) do
    idx = get_octant_index(node.bounds, entity)
    upd = update_child_at(node.children, idx, entity)
    %Octree{node | children: upd}
  end

  defp update_child_at([c0, c1, c2, c3, c4, c5, c6, c7], 0, e),
    do: [insert(c0, e), c1, c2, c3, c4, c5, c6, c7]

  defp update_child_at([c0, c1, c2, c3, c4, c5, c6, c7], 1, e),
    do: [c0, insert(c1, e), c2, c3, c4, c5, c6, c7]

  defp update_child_at([c0, c1, c2, c3, c4, c5, c6, c7], 2, e),
    do: [c0, c1, insert(c2, e), c3, c4, c5, c6, c7]

  defp update_child_at([c0, c1, c2, c3, c4, c5, c6, c7], 3, e),
    do: [c0, c1, c2, insert(c3, e), c4, c5, c6, c7]

  defp update_child_at([c0, c1, c2, c3, c4, c5, c6, c7], 4, e),
    do: [c0, c1, c2, c3, insert(c4, e), c5, c6, c7]

  defp update_child_at([c0, c1, c2, c3, c4, c5, c6, c7], 5, e),
    do: [c0, c1, c2, c3, c4, insert(c5, e), c6, c7]

  defp update_child_at([c0, c1, c2, c3, c4, c5, c6, c7], 6, e),
    do: [c0, c1, c2, c3, c4, c5, insert(c6, e), c7]

  defp update_child_at([c0, c1, c2, c3, c4, c5, c6, c7], 7, e),
    do: [c0, c1, c2, c3, c4, c5, c6, insert(c7, e)]

  defp subdivide(%Octree{bounds: {x0, y0, z0, x1, y1, z1}} = node) do
    mid = {(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2}

    children =
      Enum.map(0..7, fn i ->
        b = get_child_bounds({x0, y0, z0, x1, y1, z1}, mid, i)
        new(b, node.capacity, node.depth + 1)
      end)

    %Octree{node | children: children}
  end

  defp get_child_bounds({x0, y0, z0, x1, y1, z1}, {mx, my, mz}, idx) do
    nx0 = if (idx &&& 0b001) == 0, do: x0, else: mx
    nx1 = if (idx &&& 0b001) == 0, do: mx, else: x1
    ny0 = if (idx &&& 0b010) == 0, do: y0, else: my
    ny1 = if (idx &&& 0b010) == 0, do: my, else: y1
    nz0 = if (idx &&& 0b100) == 0, do: z0, else: mz
    nz1 = if (idx &&& 0b100) == 0, do: mz, else: z1
    {nx0, ny0, nz0, nx1, ny1, nz1}
  end

  defp get_octant_index({x0, y0, z0, x1, y1, z1}, entity) do
    mx = (x0 + x1) / 2
    my = (y0 + y1) / 2
    mz = (z0 + z1) / 2
    idx = 0
    idx = idx ||| (if entity.x >= mx, do: 0b001, else: 0)
    idx = idx ||| (if entity.y >= my, do: 0b010, else: 0)
    idx = idx ||| (if entity.z >= mz, do: 0b100, else: 0)
    idx
  end

  def remove(node, entity_id) do
    remove_recursive(node, entity_id)
  end

  defp remove_recursive(node, eid) do
    if is_nil(node.children) do
      upd = Enum.reject(node.entities, fn e -> e.id == eid end)
      %Octree{node | entities: upd}
    else
      chd = Enum.map(node.children, fn c -> remove_recursive(c, eid) end)
      %Octree{node | children: chd}
    end
  end

  def remove_by_position(%Octree{} = node, entity, position) do
    pos = to_pos_map(position)

    if is_nil(node.children) do
      upd = Enum.reject(node.entities, fn e -> e.id == entity.id end)
      %Octree{node | entities: upd}
    else
      idx = get_octant_index(node.bounds, pos)
      upd = remove_child_at(node.children, idx, entity, position)
      %Octree{node | children: upd}
    end
  end

  defp to_pos_map({x, y, z}), do: %{x: x, y: y, z: z}
  defp to_pos_map(%{x: _, y: _, z: _} = p), do: p

  defp remove_child_at([c0, c1, c2, c3, c4, c5, c6, c7], 0, e, p),
    do: [remove_by_position(c0, e, p), c1, c2, c3, c4, c5, c6, c7]

  defp remove_child_at([c0, c1, c2, c3, c4, c5, c6, c7], 1, e, p),
    do: [c0, remove_by_position(c1, e, p), c2, c3, c4, c5, c6, c7]

  defp remove_child_at([c0, c1, c2, c3, c4, c5, c6, c7], 2, e, p),
    do: [c0, c1, remove_by_position(c2, e, p), c3, c4, c5, c6, c7]

  defp remove_child_at([c0, c1, c2, c3, c4, c5, c6, c7], 3, e, p),
    do: [c0, c1, c2, remove_by_position(c3, e, p), c4, c5, c6, c7]

  defp remove_child_at([c0, c1, c2, c3, c4, c5, c6, c7], 4, e, p),
    do: [c0, c1, c2, c3, remove_by_position(c4, e, p), c5, c6, c7]

  defp remove_child_at([c0, c1, c2, c3, c4, c5, c6, c7], 5, e, p),
    do: [c0, c1, c2, c3, c4, remove_by_position(c5, e, p), c6, c7]

  defp remove_child_at([c0, c1, c2, c3, c4, c5, c6, c7], 6, e, p),
    do: [c0, c1, c2, c3, c4, c5, remove_by_position(c6, e, p), c7]

  defp remove_child_at([c0, c1, c2, c3, c4, c5, c6, c7], 7, e, p),
    do: [c0, c1, c2, c3, c4, c5, c6, remove_by_position(c7, e, p)]

  def remove_by_position(node, entity) do
    remove_by_position(node, entity, entity)
  end

  def update(node, old_entity, new_entity) do
    node
    |> remove_by_position(old_entity, old_entity)
    |> insert(new_entity)
  end

  def query_range(%Octree{} = node, position, radius) do
    pos = to_pos_map(position)

    if intersects?(node.bounds, pos, radius) do
      query_node(node, pos, radius)
    else
      []
    end
  end

  defp query_node(%Octree{children: nil} = node, pos, radius) do
    r2 = radius * radius
    Enum.filter(node.entities, fn e -> distance_sq(e, pos) <= r2 end)
  end

  defp query_node(node, pos, radius) do
    Enum.flat_map(node.children, fn c -> query_range(c, pos, radius) end)
  end

  defp distance_sq(e1, e2) do
    dx = e1.x - e2.x
    dy = e1.y - e2.y
    dz = e1.z - e2.z
    dx * dx + dy * dy + dz * dz
  end

  defp intersects?({x0, y0, z0, x1, y1, z1}, %{x: px, y: py, z: pz}, r) do
    cx = max(x0, min(px, x1))
    cy = max(y0, min(py, y1))
    cz = max(z0, min(pz, z1))

    dx = px - cx
    dy = py - cy
    dz = pz - cz

    dx * dx + dy * dy + dz * dz < r * r
  end
end
