defmodule Mutonex.Engine.LidarTest do
  use ExUnit.Case, async: true

  alias Mutonex.Engine.Lidar
  alias Mutonex.Engine.SparseOctree

  setup do
    # Create a simple octree with a single entity at {10, 10, 10}
    bounds = {0, 0, 0, 100, 100, 100}
    octree = SparseOctree.new(bounds)
    entity = %{id: 1, position: %{x: 10, y: 10, z: 10}, size: 1, bounds: {9, 9, 9, 11, 11, 11}}
    octree = SparseOctree.insert(octree, entity)
    {:ok, octree: octree}
  end

  test "cast_ray returns intersection for a ray hitting an entity", %{octree: octree} do
    # TODO: This test is failing because the ray_intersect/3 function is not correctly detecting intersections.
    observer_pos = %{x: 0, y: 0, z: 0}
    azimuth = 45.0
    polar = 45.0
    max_dist = 100.0

    result = Lidar.cast_ray(observer_pos, azimuth, polar, max_dist, octree)

    assert result != nil
    assert_in_delta result.distance, 14.142, 0.001
    assert_in_delta result.position.x, 10.0, 0.001
    assert_in_delta result.position.y, 10.0, 0.001
    assert_in_delta result.position.z, 10.0, 0.001
  end

  test "cast_ray returns nil for a ray missing all entities", %{octree: octree} do
    observer_pos = %{x: 0, y: 0, z: 0}
    azimuth = 0.0   # Ray along +X axis
    polar = 90.0    # Ray in XY plane
    max_dist = 5.0   # Too short to reach the entity at {10, 10, 10}

    result = Lidar.cast_ray(observer_pos, azimuth, polar, max_dist, octree)
    assert result == nil
  end

  test "cast_rays returns a list of intersections", %{octree: octree} do
    # TODO: This test is failing because the ray_intersect/3 function is not correctly detecting intersections.
    observer_pos = %{x: 0, y: 0, z: 0}
    azimuth_resolution = 90  # 4 rays (0°, 90°, 180°, 270°)
    polar_resolution = 90    # 2 rays (0°, 90°)
    max_dist = 100.0

    results = Lidar.cast_rays(observer_pos, azimuth_resolution, polar_resolution, max_dist, octree)

    # Should return a non-empty list (at least one ray hits the entity)
    assert length(results) > 0
    assert Enum.all?(results, fn %{distance: dist} -> dist <= max_dist end)
  end

  test "cast_rays returns empty list for max_dist = 0", %{octree: octree} do
    observer_pos = %{x: 0, y: 0, z: 0}
    azimuth_resolution = 10
    polar_resolution = 10
    max_dist = 0.0

    results = Lidar.cast_rays(observer_pos, azimuth_resolution, polar_resolution, max_dist, octree)
    assert results == []
  end
end
