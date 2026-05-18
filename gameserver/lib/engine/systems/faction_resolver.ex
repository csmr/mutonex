defmodule Mutonex.Engine.Systems.FactionResolver do
  @moduledoc """
  Resolves flavor (element) and ethnicity (faction) based on regional data 
  and geological resources.
  """
  require Logger

  @regions_path "../../../../res/regions.yaml"
  @elements_path "../../../../res/elements.yml"

  def resolve_ethnicity(region_name \\ nil) do
    case load_yaml(@regions_path) do
      {:ok, regions} ->
        case Map.get(regions, region_name || pick_random_region(regions)) do
          factions when is_list(factions) -> Enum.random(factions)
          _ -> "Unknown"
        end
      _ -> "Unknown"
    end
  end

  defp pick_random_region(regions) do
    regions |> Map.keys() |> Enum.random()
  end

  def resolve_flavor(mineral_type \\ nil) do
    # If no mineral, pick random from elements.yml
    if mineral_type == nil do
      pick_random_element()
    else
      case mineral_type do
        :iron -> "Iron"
        :potassium -> "Potassium"
        :lithium -> "Lithium"
        _ -> pick_random_element()
      end
    end
  end

  defp pick_random_element() do
    case load_yaml(@elements_path) do
      {:ok, elements} ->
        elements |> Map.values() |> Enum.random()
      _ -> "Hydrogen"
    end
  end

  def load_yaml(path) do
    abs_path = Path.expand(path, __DIR__)
    YamlElixir.read_from_file(abs_path)
  end
end
