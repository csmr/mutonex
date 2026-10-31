defmodule Mutonex.Engine.Unit do
  @moduledoc """
  Domain logic, profiles, and helpers for Unit entities (GDD 4.3).
  """
  alias Mutonex.Engine.Entities.Unit, as: UnitEntity

  @profiles %{
    head: %{
      movement_speed: 120.0,
      sight_radius: 10.0,
      is_charmable: false,
      work_hours: 14,
      rest_hours: 8
    },
    chief: %{
      movement_speed: 110.0,
      sight_radius: 10.0,
      is_charmable: true,
      work_hours: 12,
      rest_hours: 8
    },
    follower: %{
      movement_speed: 80.0,
      sight_radius: 10.0,
      is_charmable: true,
      work_hours: 8,
      rest_hours: 8
    },
    local: %{
      movement_speed: 80.0,
      sight_radius: 10.0,
      is_charmable: true,
      work_hours: 8,
      rest_hours: 8
    },
    activist: %{
      movement_speed: 100.0,
      sight_radius: 10.0,
      is_charmable: true,
      work_hours: 10,
      rest_hours: 8
    },
    air_power: %{
      movement_speed: 220.0,
      sight_radius: 50.0,
      is_charmable: false,
      work_hours: 1,
      rest_hours: 8
    }
  }

  @doc "Returns the profile map for a given unit type."
  @spec profile(atom()) :: map()
  def profile(type) do
    Map.get(@profiles, type, @profiles.follower)
  end

  @doc "Builds a Unit struct populated with type defaults."
  @spec build(atom(), map()) :: UnitEntity.t()
  def build(type, attrs \\ %{}) do
    cfg = profile(type)
    base = %UnitEntity{
      type: type,
      movement_speed: cfg.movement_speed,
      sight_radius: cfg.sight_radius,
      is_charmable: cfg.is_charmable
    }
    struct(base, attrs)
  end

  @doc "Returns movement speed in km/h for the given unit or type."
  @spec movement_speed(UnitEntity.t() | atom()) :: float()
  def movement_speed(%UnitEntity{movement_speed: speed})
      when is_number(speed) and speed > 0 do
    speed * 1.0
  end

  def movement_speed(%UnitEntity{type: type}) do
    movement_speed(type)
  end

  def movement_speed(type) when is_atom(type) do
    profile(type).movement_speed
  end

  @doc "Returns maximum speed in meters/second for tick movement."
  @spec max_speed_ms(UnitEntity.t() | atom()) :: float()
  def max_speed_ms(unit_or_type) do
    movement_speed(unit_or_type) * 1000.0 / 3600.0
  end

  @doc "Returns sight radius in km for the given unit or type."
  @spec sight_radius(UnitEntity.t() | atom()) :: float()
  def sight_radius(%UnitEntity{sight_radius: r})
      when is_number(r) and r > 0 do
    r * 1.0
  end

  def sight_radius(%UnitEntity{type: type}), do: sight_radius(type)
  def sight_radius(type) when is_atom(type) do
    profile(type).sight_radius
  end

  @doc "Returns whether the unit can be charmed."
  @spec charmable?(UnitEntity.t() | atom()) :: boolean()
  def charmable?(%UnitEntity{is_charmable: val})
      when is_boolean(val) do
    val
  end

  def charmable?(%UnitEntity{type: type}), do: charmable?(type)
  def charmable?(type) when is_atom(type) do
    profile(type).is_charmable
  end
end
