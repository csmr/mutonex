defmodule Mutonex.Engine.LidarRayIntersections do

  @doc """
  Check if a ray intersects an AABB (axis-aligned bounding box).

  ## Parameters
    - origin: Ray origin.
    - direction: Ray direction (normalized).
    - bounds: AABB bounds `{min_x, min_y, min_z, max_x, max_y, max_z}`.

  ## Returns
    - `{intersects?, distance}` tuple.
  """
  def ray_intersects_aabb?(origin, direction, bounds) do
    {t_min, t_max} =
      Enum.reduce(0..2, {0.0, :infinity}, fn axis, {t_min, t_max} ->
        dir_axis = case axis do
          0 -> direction.x
          1 -> direction.y
          2 -> direction.z
        end

        if abs(dir_axis) < 1.0e-6 do
          # Ray is parallel to the slab. No intersection if origin is outside slab.
          min_bound = elem(bounds, axis)
          max_bound = elem(bounds, axis + 3)
          origin_axis = case axis do
            0 -> origin.x
            1 -> origin.y
            2 -> origin.z
          end
          if origin_axis < min_bound or origin_axis > max_bound do
            {1.0, 0.0} # This will result in t_min > t_max, indicating no intersection
          else
            {t_min, t_max}
          end
        else
          origin_axis =
            case axis do
              0 -> origin.x
              1 -> origin.y
              2 -> origin.z
            end

          inv_dir = 1.0 / dir_axis
          t1 = (elem(bounds, axis) - origin_axis) * inv_dir
          t2 = (elem(bounds, axis + 3) - origin_axis) * inv_dir

          {t_near, t_far} = if t1 > t2, do: {t2, t1}, else: {t1, t2}

          new_t_min = max(t_min, t_near)
          new_t_max = min(t_max, t_far)

          {new_t_min, new_t_max}
        end
      end)

    intersects? = t_min <= t_max
    distance = if intersects? do
      max(t_min, 0.0)
    else
      :infinity
    end

    {intersects?, distance}
  end

  @doc """
  Traverse the octree and find the first intersection of a ray with an entity or terrain.

  ## Parameters
    - node: Octree node.
    - ray: Map with `:origin` and `:direction` keys.
    - closest_so_far: `{found?, position, distance}` tuple representing the closest intersection found so far.

  ## Returns
    - Updated `closest_so_far` tuple.
  """
  def ray_intersect(node, %{origin: origin, direction: direction}, closest_so_far) do
    {intersects_bbox?, _distance} = ray_intersects_aabb?(origin, direction, node.bounds)

    if not intersects_bbox? do
      closest_so_far
    else
      # Check entities in this node
      closest_after_entities =
        Enum.reduce(node.entities, closest_so_far, fn entity, acc ->
          case ray_intersects_entity?(entity, origin, direction) do
            {true, pos, dist} when dist < elem(acc, 2) -> {true, pos, dist}
            _ -> acc
          end
        end)

      # Recurse into children
      if node.children do
        Enum.reduce(node.children, closest_after_entities, fn child, acc ->
          ray_intersect(child, %{origin: origin, direction: direction}, acc)
        end)
      else
        closest_after_entities
      end
    end
  end

  def ray_intersect(_, _, closest_so_far), do: closest_so_far

  defp ray_intersects_entity?(entity, origin, direction) do
    # Assume entity.bounds is a tuple like `{min_x, min_y, min_z, max_x, max_y, max_z}`
    # If not, calculate bounds from entity.position and entity.size
    bounds =
      if entity.bounds do
        entity.bounds
      else
        size = entity.size || 1
        min_x = entity.position.x - size
        min_y = entity.position.y - size
        min_z = entity.position.z - size
        max_x = entity.position.x + size
        max_y = entity.position.y + size
        max_z = entity.position.z + size
        {min_x, min_y, min_z, max_x, max_y, max_z}
      end

    {intersects?, distance} = ray_intersects_aabb?(origin, direction, bounds)

    if intersects? do
      position = ray_at_distance(origin, direction, distance)
      {true, position, distance}
    else
      {false, nil, :infinity}
    end
  end

  defp ray_at_distance(%{x: ox, y: oy, z: oz}, %{x: dx, y: dy, z: dz}, distance) do
    %{x: ox + dx * distance, y: oy + dy * distance, z: oz + dz * distance}
  end
end
