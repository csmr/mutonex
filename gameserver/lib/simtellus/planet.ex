defmodule Mutonex.Simtellus.Planet do
  @moduledoc """
  Port of src/simtellus/planet.rb
  Collection of modules to approximate planetary energy fluxes in ISO units.
  """

  # Physical Constants
  @planet_radius 6371.0e3 # meters
  @g 9.80665 # m/s²
  @solar_constant 1367 # W/m2
  @axial_tilt 23.5

  # Atmos Constants
  @m_air 0.0289644 # kg/mol
  @p_air 1013.25 # hPa
  @r_air 8.31432 # Nm/molK

  # Helpers

  def sinus2range(posi, period_len, y_max, y_min) do
    posi_rad = posi / period_len * (2 * :math.pi())
    val = :math.sin(posi_rad)
    dist = y_max - y_min
    y_min + (1 + val) / 2 * dist
  end

  def sector_area(lat) do
    lat_rad = lat * :math.pi() / 180
    lat_plus_10_rad = (lat + 10) * :math.pi() / 180
    diff = abs(:math.sin(lat_plus_10_rad) - :math.sin(lat_rad))

    2 * :math.pi() *
      :math.pow(@planet_radius, 2) *
      diff *
      (10.0 / 360.0)
  end

  # EMField Module

  def solar_cycle(_yearday), do: 0.999
  def space_weather(_yearday), do: 1

  def solar_irradiance_wm2(yearday) do
    @solar_constant * solar_cycle(yearday) * orbital_effect(yearday)
  end

  def uv_influx(yearday, lat, elev) do
    altitude_effect = 0.08 # per 1000 m
    uv_multiplier = (elev / 1000) * altitude_effect
    irradiance_daily_wm2(lat, yearday) * uv_multiplier
  end

  # Orbit Module

  def orbital_effect(yearday) do
    theta = 2 * :math.pi() * (yearday - 3) / 365.0
    1 + 0.033 * :math.cos(theta)
  end

  def declination_angle(yearday) do
    tilt_rad = @axial_tilt * :math.pi() / 180
    theta = 2.0 * :math.pi() / 365.0 * (yearday + 10)
    -tilt_rad * :math.cos(theta)
  end

  def hour_angle(hour) do
    (hour - 12) * 15 * :math.pi() / 180
  end

  def incident_angle(lat, yearday, hour) do
    lat_rad = lat * :math.pi() / 180
    decl_rad = declination_angle(yearday)
    h_rad = hour_angle(hour)

    sin_term = :math.sin(lat_rad) * :math.sin(decl_rad)
    cos_term = :math.cos(lat_rad) *
               :math.cos(decl_rad) *
               :math.cos(h_rad)

    :math.acos(min(max(sin_term + cos_term, -1.0), 1.0))
  end

  def irradiance_daily_wm2(lat, yearday) do
    hourly_fluxes = for hour <- 0..23, do: hourly_flux(lat, yearday, hour)
    Enum.sum(hourly_fluxes) / 24.0
  end

  defp hourly_flux(lat, yearday, hour) do
    zenith_angle = incident_angle(lat, yearday, hour)

    case zenith_angle > :math.pi() / 2 do
      true -> 0.0
      false -> calculate_solar_flux(lat, yearday, zenith_angle)
    end
  end

  defp calculate_solar_flux(lat, yearday, zenith_angle) do
    flux = solar_irradiance_wm2(yearday) *
           weather_multiplier(yearday, lat) *
           :math.cos(zenith_angle)
    max(flux, 0.0)
  end

  # Atmos Module

  def weather_multiplier(_yearday, lat) do
    0.8 + 0.15 * (abs(lat) / 90.0)
  end

  def temp(yearday, lat, elev, _biome) do
    base = 25.0 - 40.0 * (abs(lat) / 90.0)
    swing = 5.0 + 20.0 * (abs(lat) / 90.0)
    offset = if lat >= 0, do: -80.5, else: 102.0
    season = sinus2range(yearday + offset, 365, swing, -swing)
    elev_effect = elev * (6.5 / 1000.0)

    min(max(base + season - elev_effect, -90.0), 60.0)
  end

  def pressure(yearday, lat, elev) do
    kelvin_zero = 273.15
    t_k = temp(yearday, lat, elev, 1) + kelvin_zero
    @p_air * :math.exp(-@g * elev * @m_air / (@r_air * t_k))
  end

  def rain(_yearday, _lat, _elev, _biome), do: 1
  def weather_extreme_bool, do: false
end
