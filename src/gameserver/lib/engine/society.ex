defmodule Mutonex.Engine.Society do
  @moduledoc """
  Handles Society logic, including loading regions and assigning societies to entities.
  """
  alias Mutonex.Engine.Entities.Society

  # Determine path based on environment
  # We use Path.expand relative to __DIR__ which is src/gameserver/lib/engine
  # We want src/res/regions.yaml
  # From lib/engine, up 3 levels to src/gameserver, then up one more to src.
  # No wait.
  # __DIR__ = src/gameserver/lib/engine
  # .. = src/gameserver/lib
  # ../.. = src/gameserver
  # ../../.. = src
  # ../../../res/regions.yaml = src/res/regions.yaml
  # This works for the repo structure.

  @regions_path Path.expand("../../../res/regions.yaml", __DIR__)

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
