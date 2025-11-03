defmodule Gameserver.Engine.LidarRenderer do
  @moduledoc """
  Converts LIDAR samples into renderable arcs/lines for the client.
  Supports vertical/horizontal arcs and polar/azimuthal grids.
  """

  @doc """
  Convert LIDAR samples to renderable arcs.

  ## Parameters
    - samples: List of LIDAR samples from `Gameserver.Engine.Lidar.cast_rays/5`.
    - render_type: `:vertical_arcs`, `:horizontal_arcs`, or `:grid`.

  ## Returns
    - Map with renderable data for the client:
      %{type: :lidar_render, arcs: [points], resolution: float}
  """
  def render(samples, render_type \\ :vertical_arcs) do
    case render_type do
      :vertical_arcs ->
        render_vertical_arcs(samples)
      :horizontal_arcs ->
        render_horizontal_arcs(samples)
      :grid ->
        render_grid(samples)
    end
  end

  defp render_vertical_arcs(samples) do
    # Group samples by azimuth and sort by polar angle
    samples
    |> Enum.group_by(fn %{azimuth: az} -> az end)
    |> Enum.map(fn {azimuth, points} ->
      sorted_points = Enum.sort_by(points, & &1.polar)
      %{azimuth: azimuth, points: Enum.map(sorted_points, & &1.position)}
    end)
    |> then(fn arcs -> %{type: :lidar_render, arcs: arcs, resolution: 1.0} end)
  end

  defp render_horizontal_arcs(samples) do
    # Group samples by polar and sort by azimuth
    samples
    |> Enum.group_by(fn %{polar: pol} -> pol end)
    |> Enum.map(fn {polar, points} ->
      sorted_points = Enum.sort_by(points, & &1.azimuth)
      %{polar: polar, points: Enum.map(sorted_points, & &1.position)}
    end)
    |> then(fn arcs -> %{type: :lidar_render, arcs: arcs, resolution: 1.0} end)
  end

  defp render_grid(samples) do
    # Return all points as a grid
    %{type: :lidar_render, points: Enum.map(samples, & &1.position), resolution: 1.0}
  end
end
