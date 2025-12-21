defmodule Mutonex.Engine.Society do
  @moduledoc """
  Handles Society logic, including loading regions and assigning societies to entities.
  """
  alias Mutonex.Engine.Entities.Society

  # CWD is src/gameserver, so we go up two levels to reach res/regions.yaml
  @regions_path Path.expand("../../res/regions.yaml", File.cwd!)

  # Note: @external_resource tells Mix to recompile this module if the file changes.
  @external_resource @regions_path
  @regions YamlElixir.read_from_file!(@regions_path)

  @doc """
  Returns the map of regions loaded from the YAML file.
  """
  def get_regions do
    @regions
  end

  @doc """
  Returns a random society locale based on the given location.
  Since we don't have real geo data, we mock the location -> country mapping.

  ## Parameters
  - `location`: A map with `x`, `y`, `z` keys (or similar).

  ## Returns
  - A string representing the locale (e.g., "Finnish", "Koori").
  """
  def get_random_society_locale(_location) do
    # Mock: Pick a random country from the keys
    country = Enum.random(Map.keys(@regions))
    get_random_locale_for_country(country)
  end

  @doc """
  Returns a random locale for the given country key.
  """
  def get_random_locale_for_country(country) do
    case Map.get(@regions, country) do
      nil -> "Unknown"
      locales -> Enum.random(locales)
    end
  end

  @doc """
  Creates a new Society struct for a given location.
  """
  def create_society_for_location(location, id) do
    locale = get_random_society_locale(location)
    %Society{
      id: id,
      locale: locale,
      player_id: nil
    }
  end
end
