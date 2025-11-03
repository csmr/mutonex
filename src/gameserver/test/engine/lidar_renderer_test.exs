defmodule Gameserver.Engine.LidarRendererTest do
  use ExUnit.Case, async: true

  alias Gameserver.Engine.LidarRenderer

  test "render returns vertical arcs for :vertical_arcs type" do
    samples = [
      %{azimuth: 45.0, polar: 30.0, distance: 10.0, position: %{x: 1, y: 2, z: 3}},
      %{azimuth: 45.0, polar: 60.0, distance: 15.0, position: %{x: 4, y: 5, z: 6}}
    ]
    render_data = LidarRenderer.render(samples, :vertical_arcs)

    assert render_data.type == :lidar_render
    assert length(render_data.arcs) == 1
    assert render_data.arcs[0].azimuth == 45.0
    assert length(render_data.arcs[0].points) == 2
  end

  test "render returns horizontal arcs for :horizontal_arcs type" do
    samples = [
      %{azimuth: 30.0, polar: 45.0, distance: 10.0, position: %{x: 1, y: 2, z: 3}},
      %{azimuth: 60.0, polar: 45.0, distance: 15.0, position: %{x: 4, y: 5, z: 6}}
    ]
    render_data = LidarRenderer.render(samples, :horizontal_arcs)

    assert render_data.type == :lidar_render
    assert length(render_data.arcs) == 1
    assert render_data.arcs[0].polar == 45.0
  end

  test "render returns grid for :grid type" do
    samples = [
      %{azimuth: 30.0, polar: 45.0, distance: 10.0, position: %{x: 1, y: 2, z: 3}},
      %{azimuth: 60.0, polar: 75.0, distance: 15.0, position: %{x: 4, y: 5, z: 6}}
    ]
    render_data = LidarRenderer.render(samples, :grid)

    assert render_data.type == :lidar_render
    assert length(render_data.points) == 2
  end
end
