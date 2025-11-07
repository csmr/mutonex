defmodule Gameserver.Engine.LidarRayIntersections do

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
        {_inv_dir, t1, t2} =
          case axis do
            0 ->
              {1.0 / direction.x, (elem(bounds, 0) - origin.x) / direction.x, (elem(bounds, 3) - origin.x) / direction.x}
            1 ->
              {1.0 / direction.y, (elem(bounds, 1) - origin.y) / direction.y, (elem(bounds, 4) - origin.y) / direction.y}
            2 ->
              {1.0 / direction.z, (elem(bounds, 2) - origin.z) / direction.z, (elem(bounds, 5) - origin.z) / direction.z}
          end

        t1 = min(t1, t2)
        t2 = max(t1, t2)

        new_t_min = max(t_min, t1)
        new_t_max = min(t_max, t2)

        {new_t_min, new_t_max}
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
  def ray_intersect(node, %{origin: origin, direction: direction}, {false, _, _} = closest_so_far) do
    {intersects_bbox?, _distance} = ray_intersects_aabb?(origin, direction, node.bounds)

    if not intersects_bbox? do
      closest_so_far
    else
      # Check entities in this node
      new_closest =
        Enum.reduce(node.entities, closest_so_far, fn entity, {found?, _, closest_dist} ->
          if found? do
            {true, nil, closest_dist}
          else
            case ray_intersects_entity?(entity, origin, direction) do
              {true, entity_pos, entity_dist} ->
                if entity_dist < closest_dist do
                  {true, entity_pos, entity_dist}
                else
                  {false, nil, closest_dist}
                end
              _ ->
                {false, nil, closest_dist}
            end
          end
        end)

      # Recurse into children if no intersection found yet
      case new_closest do
        {true, _, _} ->
          new_closest
        _ ->
          case node.children do
            nil -> closest_so_far
            children ->
              Enum.reduce(children, closest_so_far, fn child, acc ->
                ray_intersect(child, %{origin: origin, direction: direction}, acc)
              end)
          end
      end
    end
  end

  def ray_intersect(_, _, closest_so_far), do: closest_so_far

  @doc """
  Check if a ray intersects an entity's bounding box.

  ## Parameters
    - entity: Entity map with `:position` and `:bounds` (or size).
    - origin: Ray origin.
    - direction: Ray direction.

  ## Returns
    - `{intersects?, position, distance}` tuple.
  """
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

  @doc """
  Calculate the position along a ray at a given distance.

  ## Parameters
    - origin: Ray origin.
    - direction: Ray direction.
    - distance: Distance from origin.

  ## Returns
    - Position map `%{x: float, y: float, z: float}`.
  """
  defp ray_at_distance(%{x: ox, y: oy, z: oz}, %{x: dx, y: dy, z: dz}, distance) do
    %{x: ox + dx * distance, y: oy + dy * distance, z: oz + dz * distance}
  end
end
