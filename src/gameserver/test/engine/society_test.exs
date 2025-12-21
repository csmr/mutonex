defmodule Mutonex.Engine.SocietyTest do
  use ExUnit.Case, async: true
  alias Mutonex.Engine.Society

  test "loads regions from yaml" do
    regions = Society.get_regions()
    assert is_map(regions)
    assert Map.has_key?(regions, "Finland")
    assert "Finnish" in regions["Finland"]
  end

  test "get_random_locale_for_country returns a valid locale" do
    locale = Society.get_random_locale_for_country("Finland")
    assert locale in ["Swedish", "Finnish", "Northern Sámi"]
  end

  test "get_random_society_locale returns a string" do
    # Since it picks a random country, we just check it returns a binary string
    locale = Society.get_random_society_locale(%{x: 0, y: 0, z: 0})
    assert is_binary(locale)
    assert String.length(locale) > 0
  end

  test "create_society_for_location returns a Society struct" do
    society = Society.create_society_for_location(%{x: 10, y: 0, z: 10}, "soc_1")
    assert %Mutonex.Engine.Entities.Society{} = society
    assert society.id == "soc_1"
    assert is_binary(society.locale)
  end
end
