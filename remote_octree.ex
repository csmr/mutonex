defmodule Mutonex.Engine.SparseOctree do
  import Bitwise
  defstruct node: nil, bounds: nil, entities: [], children: nil, capacity: 4

  @default_capacity 4 # Maximum number of entities per node before subdividing

  def new(bounds, capacity \\ @default_capacity) do
    %__MODULE__{bounds: bounds, entities: [], capacity: capacity}
  end

  def insert(%__MODULE__{} = node, entity) do
    if is_nil(node.children) do
      if length(node.entities) < node.capacity do
        # If we are a leaf and have space, just add it
        %__MODULE__{node | entities: [entity | node.entities]}
      else
        # If we are full, subdivide and push ALL existing entities + new one to children
        new_node = subdivide(node)

        # Re-insert existing entities into the new structure (children)
        new_node = Enum.reduce(node.entities, new_node, fn existing_entity, acc_node ->
          insert_into_child(acc_node, existing_entity)
        end)

        # Clear local entities as they are now in children
        new_node = %__MODULE__{new_node | entities: []}

        # Finally insert the new entity
        insert_into_child(new_node, entity)
      end
    else
      # If we are a branch, just pass it down
      insert_into_child(node, entity)
    end
  end

  defp insert_into_child(node, entity) do
    index = get_octant_index(node.bounds, entity)
    child = Enum.at(node.children, index)
    updated_child = insert(child, entity)
    %__MODULE__{node | children: List.replace_at(node.children, index, updated_child)}
  end

  defp subdivide(%__MODULE__{} = node) do
    bounds = node.bounds
    {min_x, min_y, min_z, max_x, max_y, max_z} = if is_tuple(bounds), do: bounds, else: List.to_tuple(bounds)

    mid_x = (min_x + max_x) / 2
    mid_y = (min_y + max_y) / 2
    mid_z = (min_z + max_z) / 2

    half = {mid_x, mid_y, mid_z}

    children = Enum.map(0..7, fn i ->
      child_bounds = get_child_bounds({min_x, min_y, min_z, max_x, max_y, max_z}, half, i)
      new(child_bounds, node.capacity)
    end)

    %__MODULE__{node | children: children}
  end

  defp get_child_bounds({min_x, min_y, min_z, max_x_val, max_y_val, max_z_val}, {mid_x, mid_y, mid_z}, index) do
    new_min_x = if (index &&& 0b001) == 0, do: min_x, else: mid_x
    new_max_x = if (index &&& 0b001) == 0, do: mid_x, else: max_x_val

    new_min_y = if (index &&& 0b010) == 0, do: min_y, else: mid_y
    new_max_y = if (index &&& 0b010) == 0, do: mid_y, else: max_y_val

    new_min_z = if (index &&& 0b100) == 0, do: min_z, else: mid_z
    new_max_z = if (index &&& 0b100) == 0, do: mid_z, else: max_z_val

    {new_min_x, new_min_y, new_min_z, new_max_x, new_max_y, new_max_z}
  end

  defp get_octant_index(bounds, entity) do
    {min_x, min_y, min_z, max_x, max_y, max_z} = if is_tuple(bounds), do: bounds, else: List.to_tuple(bounds)

    mid_x = (min_x + max_x) / 2
    mid_y = (min_y + max_y) / 2
    mid_z = (min_z + max_z) / 2

    index = 0
    # Octant logic: 0bZYX
    # X: 0 if < mid, 1 if >= mid
    index = index ||| (if entity.x >= mid_x, do: 0b001, else: 0)
    index = index ||| (if entity.y >= mid_y, do: 0b010, else: 0)
    index = index ||| (if entity.z >= mid_z, do: 0b100, else: 0)

    index
  end

  def remove(node, entity_id) do
     remove_recursive(node, entity_id)
  end

  defp remove_recursive(node, entity_id) do
    if is_nil(node.children) do
      updated_entities = Enum.reject(node.entities, fn e -> e.id == entity_id end)
      %__MODULE__{node | entities: updated_entities}
    else
      # Must search all children if we don't know where it is
      updated_children = Enum.map(node.children, fn child -> remove_recursive(child, entity_id) end)
      %__MODULE__{node | children: updated_children}
    end
  end

  def remove_by_position(%__MODULE__{} = node, entity, position) do
    # position is expected to be {x, y, z} or map %{x:.., ...}
    pos_map = case position do
        {x, y, z} -> %{x: x, y: y, z: z}
        %{x: _, y: _, z: _} = p -> p
    end

    if is_nil(node.children) do
      # Leaf node: remove entity if present
      updated_entities = Enum.reject(node.entities, fn e -> e.id == entity.id end)
      %__MODULE__{node | entities: updated_entities}
    else
      index = get_octant_index(node.bounds, pos_map)
      child = Enum.at(node.children, index)
      updated_child = remove_by_position(child, entity, position)
      %__MODULE__{node | children: List.replace_at(node.children, index, updated_child)}
    end
  end

  # Fallback for old API if needed (but test uses 3-arity)
  def remove_by_position(node, entity) do
      remove_by_position(node, entity, entity)
  end

  def update(node, old_entity, new_entity) do
    # Remove from old position, insert at new
    node
    |> remove_by_position(old_entity, old_entity)
    |> insert(new_entity)
  end

  def query_range(%__MODULE__{} = node, position, radius) do
    pos_map = case position do
        {x, y, z} -> %{x: x, y: y, z: z}
        %{x: _, y: _, z: _} = p -> p
    end

    if intersects?(node.bounds, pos_map, radius) do
      if is_nil(node.children) do
        Enum.filter(node.entities, fn e -> distance(e, pos_map) <= radius end)
      else
        Enum.flat_map(node.children, fn child -> query_range(child, pos_map, radius) end)
      end
    else
      []
    end
  end

  defp intersects?(bounds, %{x: px, y: py, z: pz}, radius) do
    {min_x, min_y, min_z, max_x, max_y, max_z} = if is_tuple(bounds), do: bounds, else: List.to_tuple(bounds)

    closest_x = max(min_x, min(px, max_x))
    closest_y = max(min_y, min(py, max_y))
    closest_z = max(min_z, min(pz, max_z))

    dx = px - closest_x
    dy = py - closest_y
    dz = pz - closest_z

    (dx * dx + dy * dy + dz * dz) < (radius * radius)
  end

  defp intersects?(bounds, {px, py, pz}, radius) do
    intersects?(bounds, %{x: px, y: py, z: pz}, radius)
  end

  defp distance(e1, e2) do
    # Support both Map with x/y/z and struct
    dx = e1.x - e2.x
    dy = e1.y - e2.y
    dz = e1.z - e2.z
    :math.sqrt(dx * dx + dy * dy + dz * dz)
  end
end
