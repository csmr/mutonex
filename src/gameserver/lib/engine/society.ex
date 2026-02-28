defmodule Mutonex.Engine.Society do
  @moduledoc """
  Handles Society logic, including loading regions
  and assigning societies to entities.
  """
  alias Mutonex.Engine.Entities.Society
  alias Mutonex.Utils.Resource

  # Resolve path for regions.yaml (local & container)
  @regions_path Resource.resolve_path(
    "regions.yaml",
    __DIR__
  )

  @external_resource @regions_path
  @regions YamlElixir.read_from_file!(@regions_path)

  @doc "Returns the map of regions loaded from YAML."
  def get_regions, do: @regions

  @doc "Returns random society locale based on location."
  def get_random_society_locale(_loc) do
    country = Enum.random(Map.keys(@regions))
    get_random_locale_for_country(country)
  end

  @doc "Returns a random locale for the country key."
  def get_random_locale_for_country(country) do
    case Map.get(@regions, country) do
      nil -> "Unknown"
      locales -> Enum.random(locales)
    end
  end

  @doc "Creates a new Society struct for a location."
  def create_society_for_location(loc, id) do
    locale = get_random_society_locale(loc)
    %Society{id: id, locale: locale, player_id: nil}
  end
end
