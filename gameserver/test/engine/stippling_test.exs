defmodule Mutonex.Engine.StipplingTest do
  use ExUnit.Case, async: true

  alias Mutonex.Engine.Stippling
  alias Mutonex.Engine.FaunaBehavior
  alias Mutonex.Engine.TerrainGenerator

  describe "stippling algorithm" do
    test "generates points satisfying min distance" do
      r = 3.0
      b = %{x_min: 0.0, x_max: 30.0, z_min: 0.0, z_max: 30.0}
      opts = [min_dist: r, bounds: b]
      pts = Stippling.generate_points(opts)

      assert length(pts) > 1
      assert verify_min_distance(pts, r)
    end

    test "all points fall within defined bounds" do
      b = %{x_min: -10.0, x_max: 10.0, z_min: -10.0, z_max: 10.0}
      pts = Stippling.generate_points(bounds: b, min_dist: 2.0)

      assert Enum.all?(pts, fn p ->
               p.x >= b.x_min && p.x <= b.x_max &&
                 p.z >= b.z_min && p.z <= b.z_max
             end)
    end

    test "calculate_cone computes valid angles" do
      p = %{x: 0.0, y: 0.0, z: 0.0}
      parent = %{x: 3.0, y: 0.0, z: 0.0}
      r = 2.0

      {alpha, beta} = Stippling.calculate_cone(p, parent, r)

      assert is_float(alpha)
      assert is_float(beta)
      assert beta > 0.0 && beta <= :math.pi()
    end

    test "draw_sample produces valid candidate" do
      p = %{x: 5.0, y: 0.0, z: 5.0}
      parent = %{x: 8.0, y: 0.0, z: 5.0}
      r = 2.5
      elev_fn = fn _x, _z -> 0.0 end

      cand = Stippling.draw_sample(p, parent, r, elev_fn)
      dx = cand.x - p.x
      dz = cand.z - p.z
      dist = :math.sqrt(dx * dx + dz * dz)

      assert dist >= r
      assert dist <= 2.0 * r
    end

    test "snaps Y elevation using elevation_fn or terrain" do
      terrain = TerrainGenerator.generate_heightmap(10, 10)
      opts = [terrain: terrain, min_dist: 2.0]
      pts = Stippling.generate_points(opts)

      assert length(pts) > 0
      assert Enum.all?(pts, fn p -> is_float(p.y) end)
    end

    test "FaunaBehavior.spawn uses stippling" do
      fauna_map = FaunaBehavior.spawn("s1", 10, min_dist: 3.0)

      assert map_size(fauna_map) == 10

      pts =
        Enum.map(fauna_map, fn {_id, f} ->
          f.position
        end)

      assert length(pts) == 10
    end
  end

  defp verify_min_distance(pts, r) do
    r_sq = r * r - 1.0e-6

    pairs = for p1 <- pts, p2 <- pts, p1 != p2, do: {p1, p2}

    Enum.all?(pairs, fn {p1, p2} ->
      dx = p1.x - p2.x
      dz = p1.z - p2.z
      dx * dx + dz * dz >= r_sq
    end)
  end
end
