defmodule Gameserver.Engine.Lidar do
  @moduledoc """
  Handles LIDAR-style raytracing for the game.
  Generates samples by casting rays in spherical coordinates and intersecting with the octree/terrain.
  """

  alias Gameserver.Engine.SparseOctree
  alias Gameserver.Engine.LidarRayIntersections

  @doc """
  Cast LIDAR rays in spherical coordinates from an observer.

  ## Parameters
    - observer_pos: Position of the observer (e.g., a unit or player).
    - azimuth_resolution: Degrees per ray in the azimuth (horizontal) plane.
    - polar_resolution: Degrees per ray in the polar (vertical) plane.
    - max_distance: Maximum distance to cast rays.
    - octree: The sparse octree representing the game world.

  ## Returns
    - List of `%{azimuth: float, polar: float, distance: float, position: map}` tuples.
  """
  def cast_rays(observer_pos, azimuth_resolution, polar_resolution, max_distance, octree) do
    for azimuth <- 0..360//azimuth_resolution,
        polar <- 0..180//polar_resolution do
      rad_azimuth = :math.pi() * azimuth / 180.0
      rad_polar = :math.pi() * polar / 180.0
      direction = %{
        x: :math.sin(rad_polar) * :math.cos(rad_azimuth),
        y: :math.sin(rad_polar) * :math.sin(rad_azimuth),
        z: :math.cos(rad_polar)
      }
      {intersected?, position, distance} =
        LidarRayIntersections.ray_intersect(
          octree,
          %{origin: observer_pos, direction: direction},
          {false, nil, :infinity}
        )
      if intersected? and distance <= max_distance do
        %{azimuth: azimuth, polar: polar, distance: distance, position: position}
      else
        nil
      end
    end
    |> Enum.reject(&(&1 == nil))
  end

  @doc """
  Cast a single LIDAR ray and return the intersection.

  ## Parameters
    - observer_pos: Origin of the ray.
    - azimuth: Azimuth angle (degrees).
    - polar: Polar angle (degrees).
    - max_distance: Maximum distance to cast the ray.
    - octree: The sparse octree.

  ## Returns
    - `%{azimuth: float, polar: float, distance: float, position: map}` or `nil`.
  """
  def cast_ray(observer_pos, azimuth, polar, max_distance, octree) do
    rad_azimuth = :math.pi() * azimuth / 180.0
    rad_polar = :math.pi() * polar / 180.0
    direction = %{
      x: :math.sin(rad_polar) * :math.cos(rad_azimuth),
      y: :math.sin(rad_polar) * :math.sin(rad_azimuth),
      z: :math.cos(rad_polar)
    }
    {intersected?, position, distance} =
      SparseOctree.ray_intersect(
        octree,
        %{origin: observer_pos, direction: direction},
        {false, nil, :infinity}
      )
    if intersected? and distance <= max_distance do
      %{azimuth: azimuth, polar: polar, distance: distance, position: position}
    else
      nil
    end
  end
end
