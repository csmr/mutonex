defmodule Mutonex.Engine.Stippling do
  @moduledoc """
  Poisson disk sampling using Bridson's algorithm
  with parental cone optimization.
  """

  defstruct [
    :bounds,
    :r,
    :k,
    :cell_size,
    :grid,
    :active,
    :parents,
    :points,
    :elevation_fn
  ]

  alias Mutonex.Engine.Stippling
  alias Mutonex.Engine.TerrainGenerator

  @doc "Generates points obeying min distance r within bounds."
  def generate_points(opts \\ []) do
    state = init_state(opts)
    run(state)
  end

  defp init_state(opts) do
    r = Keyword.get(opts, :min_dist, 3.0)
    k = Keyword.get(opts, :k, 30)
    raw_bounds = Keyword.get(opts, :bounds)
    bounds = normalize_bounds(raw_bounds)
    cell = r / :math.sqrt(2.0)
    elev_fn = build_elevation_fn(opts)
    p0 = init_point(bounds, elev_fn)
    grid = put_grid(%{}, p0, bounds, cell)

    %Stippling{
      bounds: bounds,
      r: r,
      k: k,
      cell_size: cell,
      grid: grid,
      active: [p0],
      parents: %{},
      points: [p0],
      elevation_fn: elev_fn
    }
  end

  defp build_elevation_fn(opts) do
    case Keyword.get(opts, :elevation_fn) do
      fun when is_function(fun, 2) ->
        fun

      _ ->
        case Keyword.get(opts, :terrain) do
          nil ->
            fn _x, _z -> 0.0 end

          t ->
            fn x, z ->
              TerrainGenerator.sample_elevation(t, x, z)
            end
        end
    end
  end

  @doc "Normalizes bounds formats to standard x/z min/max."
  def normalize_bounds(%{x_min: _, x_max: _} = b) do
    b
  end

  def normalize_bounds(%{x: x, z: z}) do
    %{
      x_min: x - 10.0,
      x_max: x + 10.0,
      z_min: z - 10.0,
      z_max: z + 10.0
    }
  end

  def normalize_bounds(_), do: default_bounds()

  defp default_bounds do
    %{
      x_min: -25.0,
      x_max: 25.0,
      z_min: -25.0,
      z_max: 25.0
    }
  end

  defp init_point(b, elev_fn) do
    x = b.x_min + :rand.uniform() * (b.x_max - b.x_min)
    z = b.z_min + :rand.uniform() * (b.z_max - b.z_min)
    y = elev_fn.(x, z)
    %{x: x, y: y, z: z}
  end

  defp run(%Stippling{active: []} = s) do
    Enum.reverse(s.points)
  end

  defp run(state) do
    p = Enum.random(state.active)
    parent = Map.get(state.parents, p)
    cand = sample_candidate(p, parent, state.r, state.k, state)

    case cand do
      nil ->
        new_act = List.delete(state.active, p)
        run(%{state | active: new_act})

      q ->
        b = state.bounds
        c = state.cell_size
        new_grid = put_grid(state.grid, q, b, c)
        new_act = [q | state.active]
        new_par = Map.put(state.parents, q, p)
        new_pts = [q | state.points]

        run(%{
          state
          | grid: new_grid,
            active: new_act,
            parents: new_par,
            points: new_pts
        })
    end
  end

  defp sample_candidate(_p, _parent, _r, 0, _s), do: nil

  defp sample_candidate(p, parent, r, attempts, state) do
    q = draw_sample(p, parent, r, state.elevation_fn)

    if valid_sample?(q, state) do
      q
    else
      sample_candidate(p, parent, r, attempts - 1, state)
    end
  end

  @doc "Samples candidate point in annulus around p."
  def draw_sample(p, nil, r, elev_fn) do
    theta = :rand.uniform() * 2.0 * :math.pi()
    dist = r * :math.sqrt(1.0 + 3.0 * :rand.uniform())
    x = p.x + dist * :math.cos(theta)
    z = p.z + dist * :math.sin(theta)
    y = elev_fn.(x, z)
    %{x: x, y: y, z: z}
  end

  def draw_sample(p, parent, r, elev_fn) do
    {alpha, beta} = calculate_cone(p, parent, r)
    theta = sample_outside_cone(alpha, beta)
    dist = r * :math.sqrt(1.0 + 3.0 * :rand.uniform())
    x = p.x + dist * :math.cos(theta)
    z = p.z + dist * :math.sin(theta)
    y = elev_fn.(x, z)
    %{x: x, y: y, z: z}
  end

  @doc "Calculates shadow cone center alpha and half-width beta."
  def calculate_cone(p, parent, r) do
    dx = parent.x - p.x
    dz = parent.z - p.z
    d = :math.sqrt(dx * dx + dz * dz)
    alpha = :math.atan2(dz, dx)
    term1 = clamp((d * d + 3.0 * r * r) / (4.0 * r * d), -1.0, 1.0)
    term2 = clamp(d / (2.0 * r), -1.0, 1.0)
    beta = min(:math.acos(term1), :math.acos(term2))
    {alpha, beta}
  end

  defp sample_outside_cone(alpha, beta) do
    allowed = 2.0 * :math.pi() - 2.0 * beta
    delta = :rand.uniform() * allowed
    alpha + beta + delta
  end

  defp clamp(val, low, high) do
    max(low, min(high, val))
  end

  defp valid_sample?(q, state) do
    in_bounds?(q, state.bounds) && !collides?(q, state)
  end

  defp in_bounds?(q, b) do
    q.x >= b.x_min && q.x <= b.x_max &&
      q.z >= b.z_min && q.z <= b.z_max
  end

  defp collides?(q, state) do
    {col, row} = grid_coords(q, state.bounds, state.cell_size)
    r_sq = state.r * state.r

    Enum.any?(-2..2, fn dc ->
      Enum.any?(-2..2, fn dr ->
        case Map.get(state.grid, {col + dc, row + dr}) do
          nil -> false
          p -> dist_sq(q, p) < r_sq
        end
      end)
    end)
  end

  defp dist_sq(p1, p2) do
    dx = p1.x - p2.x
    dz = p1.z - p2.z
    dx * dx + dz * dz
  end

  defp grid_coords(p, bounds, cell) do
    col = floor((p.x - bounds.x_min) / cell)
    row = floor((p.z - bounds.z_min) / cell)
    {col, row}
  end

  defp put_grid(grid, p, bounds, cell) do
    coords = grid_coords(p, bounds, cell)
    Map.put(grid, coords, p)
  end
end
