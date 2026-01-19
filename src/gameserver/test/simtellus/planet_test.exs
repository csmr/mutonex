defmodule Mutonex.Simtellus.PlanetTest do
  use ExUnit.Case
  alias Mutonex.Simtellus.Planet

  test "sinus2range" do
    cases = [{0, 1}, {0.75, 3}, {1.5, 1}, {2.25, -1}, {3, 1}]
    Enum.each(cases, fn {n, expected} ->
      res = Planet.sinus2range(n, 3, 3, -1)
      assert Float.round(res, 3) == Float.round(expected / 1.0, 3)
    end)
  end

  test "irradiance_daily_wm2 physical ranges" do
    cases = [
      # lat, day, min, max
      {0, 80, 300, 400},     # Equator at equinox
      {90, 172, 450, 550},   # North Pole summer solstice
      {90, 356, 0, 0},       # North Pole winter solstice
      {-90, 172, 0, 0},      # South Pole winter solstice
      {45, 172, 350, 450},   # Mid-latitude summer
      {45, 356, 50, 150}     # Mid-latitude winter
    ]

    Enum.each(cases, fn {lat, day, min, max} ->
      res = Planet.irradiance_daily_wm2(lat, day)
      assert is_float(res)
      if min == 0 and max == 0 do
         assert res == 0.0
      else
         assert res >= min and res <= max
      end
    end)
  end

  test "solar_cycle" do
    res = Planet.solar_cycle(:rand.uniform(365))
    assert is_float(res)
    assert res <= 2 and res >= 0
  end

  test "orbital_effect" do
    range_pass = Enum.all?(0..365, fn day ->
      val = Planet.orbital_effect(day)
      val >= 0.966 and val <= 1.034
    end)
    assert range_pass

    assert Planet.orbital_effect(3) > Planet.orbital_effect(185)
  end

  test "solar_irradiance_wm2" do
    res = Planet.solar_irradiance_wm2(:rand.uniform(365))
    assert is_float(res)
    # Solar constant is 1367.
    assert res < 1367 * 1.069
  end

  test "pressure" do
    day = :rand.uniform(365)
    lat = -90 + :rand.uniform() * 180
    elev = :rand.uniform() * 100
    res = Planet.pressure(day, lat, elev)
    assert res > 870 and res < 1085
  end

  test "temp plausible values" do
    # 1. Equator warmer than pole
    t_equator = Planet.temp(80, 0, 0, 0)
    t_pole = Planet.temp(172, 90, 0, 0)
    assert t_equator > t_pole

    # 2. Summer warmer than winter
    t_summer = Planet.temp(172, 45, 0, 0)
    t_winter = Planet.temp(356, 45, 0, 0)
    assert t_summer > t_winter

    # 3. Altitude colder
    t_sea = Planet.temp(80, 0, 0, 0)
    t_mtn = Planet.temp(80, 0, 5000, 0)
    assert t_sea > t_mtn

    # 4. Absolute limits
    t_min = Planet.temp(356, 90, 2000, 0)
    t_max = Planet.temp(172, 20, 0, 0)
    assert t_min >= -90 and t_min <= 60
    assert t_max >= -90 and t_max <= 60
  end
end
