defmodule Mutonex.Engine.TerrainGenerator do
  alias Mutonex.Engine.Entities.Terrain

  @doc "Generates procedural heightmap for sector."
  def generate_heightmap(width, height) do
    noise_grid = generate_noise(width, height)
    smoothed_grid = apply_smoothing(noise_grid, 3)
    quantized_grid = quantize(smoothed_grid, 9)
    normalized_grid = normalize_to_median_zero(quantized_grid)

    %Terrain{
      size: %{width: width, height: height},
      data: normalized_grid
    }
  end

  @doc "Samples terrain surface elevation Y at world X, Z."
  def sample_elevation(nil, _x, _z), do: 0.0

  def sample_elevation(%Terrain{size: s, data: grid}, x, z) do
    w = s.width
    h = s.height
    gx = clamp(floor(x + w / 2.0), 0, w - 1)
    gz = clamp(floor(z + h / 2.0), 0, h - 1)

    case Enum.at(grid, gz) do
      nil -> 0.0
      row -> (Enum.at(row, gx) || 0) * 1.0
    end
  end

  defp clamp(val, low, high) do
    max(low, min(high, val))
  end

  defp generate_noise(width, height) do
    for _ <- 1..height do
      for _ <- 1..width do
        :rand.uniform()
      end
    end
  end

  defp apply_smoothing(grid, passes) do
    Enum.reduce(1..passes, grid, fn _, current_grid ->
      box_blur(current_grid)
    end)
  end

  defp box_blur(grid) do
    height = length(grid)
    width = length(hd(grid))

    for y <- 0..(height - 1) do
      for x <- 0..(width - 1) do
        average_neighbors(grid, x, y, width, height)
      end
    end
  end

  defp average_neighbors(grid, x, y, width, height) do
    neighbors =
      for dy <- -1..1, dx <- -1..1 do
        nx = x + dx
        ny = y + dy

        if nx >= 0 && nx < width && ny >= 0 && ny < height do
          get_value(grid, nx, ny)
        else
          nil
        end
      end
      |> Enum.reject(&is_nil/1)

    Enum.sum(neighbors) / length(neighbors)
  end

  defp quantize(grid, levels) do
    min_val = Enum.min(Enum.flat_map(grid, & &1))
    max_val = Enum.max(Enum.flat_map(grid, & &1))
    range = max_val - min_val

    for row <- grid do
      for val <- row do
        if range == 0 do
          0
        else
          norm = (val - min_val) / range
          floor(norm * (levels - 1))
        end
      end
    end
  end

  defp normalize_to_median_zero(grid) do
    flat = Enum.flat_map(grid, & &1)
    sorted = Enum.sort(flat)
    median = Enum.at(sorted, div(length(sorted), 2))
    offset = 0 - median

    for row <- grid do
      for val <- row do
        val + offset
      end
    end
  end

  defp get_value(grid, x, y) do
    grid |> Enum.at(y) |> Enum.at(x)
  end
end
