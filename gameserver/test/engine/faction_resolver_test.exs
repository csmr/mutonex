defmodule Mutonex.Engine.Systems.FactionResolverTest do
  use ExUnit.Case, async: true
  alias Mutonex.Engine.Systems.FactionResolver

  test "resolve_ethnicity/1 returns a valid region faction" do
    ethnicity = FactionResolver.resolve_ethnicity()
    assert is_binary(ethnicity)
    assert ethnicity != "Unknown"
  end

  test "resolve_ethnicity/1 returns faction for known region" do
    ethnicity = FactionResolver.resolve_ethnicity("Finland")
    assert is_binary(ethnicity)
    assert ethnicity in ["Finnish", "Swedish", "Northern Sámi"]
  end

  test "resolve_flavor/1 returns a valid flavor element" do
    flavor = FactionResolver.resolve_flavor()
    assert is_binary(flavor)
    assert flavor != "Hydrogen"
  end

  test "resolve_flavor/1 returns element for known minerals" do
    assert FactionResolver.resolve_flavor(:iron) == "Iron"
    assert FactionResolver.resolve_flavor(:potassium) == "Potassium"
    assert FactionResolver.resolve_flavor(:lithium) == "Lithium"
  end
end
