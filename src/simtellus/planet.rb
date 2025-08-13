require 'date'

module Planet
  # Collection of modules to approximate planetary energy fluxes in ISO units.
  # TODO test suite
  # TODO render svg graph for year 2017 and 2017-2037 year periods

  # Physical Constants
  PLANET_RADIUS = 6371e3 # meters
  G = 9.80665 # gravitational acceleration at sea-level, m/s²
  Solar_Constant = 1367 # W/m2
  Solar_Constant_Range = 1.069 # solar minima+ / maxima-
  EQUINOX_DAY_N = Date.civil(2020, 3, 20).yday
  AXIAL_TILT = 23.5

  # Atmos Constants
  M_air = 0.0289644 # air molar mass, kg/mol
  P_air = 1013.25 # air pressure at sea-level, hectoPascals
  R_air = 8.31432 # gas constant, Nm/molK
  C_p_air = 2.37789552 # specific heat capacity Jkg/K
  Solar_Influx            = 340.4
  Solar_Influx_Reflected  = 99.9 # into space
  Solar_Transmission_W    = 240.5 # source ?
  Solar_Trans_Twilight    = 10 # source ?
  Reflection_Atmos        = 77.0
  Absorption_Influx       = 77.1
  Absorption_Geosp_IR     = 358.2
  Exradiation_IR_Atmos    = 169.9
  Exradiation_IR_Clouds   = 29.9
  Exradiation_IR_Geosp    = 40.1

  # Geosphere Constants
  Net_Absorption = 0.6 # Wm² absorbed
  Solar_Influx_Absorption   = 163.3 # solar influx absorbed
  Geosphere_Solar_Influx_Reflected    = 22.9 # Renamed to avoid conflict
  Atmospheric_Backradiation = 340.3
  Exradiation_Surface       = 398.2
  Exconvection_Exconduction = 18.4
  Ex_Latent_Heat            = 86.4

  # into space
  Energy_Exradiation_IR_Total = 239.9 # Wm²

  # Sine cycle helper method
  # starts from median towards maxima, then minima
  # posi: current position along period
  # period_len: period length, from 0
  # y_max, y_min: min/max to extrapolate sine -1..1
  # returns extrapolated sinus y value for current position x
  def self.sinus2range(posi, period_len, y_max, y_min)
    posi = posi.to_f / period_len * (2 * Math::PI)
    val = Math.sin(posi.to_f)
    dist = y_max - y_min
    y_min + (1 + val) / 2 * dist
  end

  # Calculates the area of a 10x10 degree sector on the planet's surface.
  # lat: The starting latitude of the sector (in degrees).
  # returns area in square meters.
  def self.sector_area(lat)
    # Convert degrees to radians for trigonometric functions
    lat_rad = lat * Math::PI / 180
    lat_plus_10_rad = (lat + 10) * Math::PI / 180

    # Area of a 10-degree latitude band
    zone_area = 2 * Math::PI * PLANET_RADIUS**2 * (Math.sin(lat_plus_10_rad) - Math.sin(lat_rad)).abs
    # Area of a 10-degree longitude slice of that band
    zone_area * (10.0 / 360.0)
  end

  module EMField
    # The actual direct solar irradiance at the top of the atmosphere fluctuates by
    # about 6.9% during a year (from 1.412 kW/m² in early January to 1.321 kW/m² in
    # early July) due to the Earth's varying distance from the Sun, and typically
    # by much less than 0.1% from day to day.

    # yearday is the day of the year 1..365
    # returns multiplier 0..2
    def solar_cycle(_yearday)
      # Schwabe cycle of 10.66 a, Gleisberg 88 a, Devries 208 a, Eddy 1000 a
      # last maxima july 1990, feb 2001 -> next maxima 2011
      # 2025 maxima earlier in 2024
      # Solar_Constant + sinus2range( days % 10.66, 10.66, -Solar_Constant_Range,
      # Solar_Constant_Range )
      # todo normalize to nearest maxima
      # p "EMField.solar_cycle is static sunspot mock."
      0.999
    end

    # returns multiplier
    def space_weather(_yearday)
      # solar wind
      # magnetic storms
      1
    end

    # arg yearday 1..365
    # returns W/m²
    def solar_irradiance_wm2(yearday)
      Solar_Constant *
        solar_cycle(yearday) *
        orbital_effect(yearday)
    end

    # returns W/m²
    def uv_influx(yearday, lat, elevation)
      p 'EMField.uv multiplier mock is static'
      altitude_effect = 0.08 # per 1000 m, Blumenthal 1997
      uv_multiplier = (elevation / 1000) * altitude_effect
      energy_transmitted(yearday, lat) * uv_multiplier
    end
  end

  # Effects of orbital eccentricity and obliquity
  # todo memoization
  module Orbit
    #	Calculates the daylength (compared to 1 = 24h)
    #	arg day of year 1..365
    #	returns multiplier
    def orbital_effect(yearday)
      # Models the ~3.4% variation in solar intensity due to Earth's orbital eccentricity.
      # Perihelion (closest) is ~Jan 3 (day 3), aphelion (farthest) is ~July 4 (day 185).
      # The flux is proportional to 1/r^2, so this is an approximation of that effect.
      1 + 0.033 * Math.cos(2 * Math::PI * (yearday - 3) / 365.0)
    end

  ############################ NEW CODE

    require 'numeric'

    # Calculates the solar declination angle for a given day of the year.
    # The declination is the angle between the sun's rays and the plane of the Earth's equator.
    # Returns the declination angle in radians.
    def declination_angle(yearday)
      # A standard approximation for solar declination.
      # The formula is based on the Earth's axial tilt and its position in its orbit.
      # 23.45 degrees is the approximate axial tilt. We convert it to radians.
      axial_tilt_rad = AXIAL_TILT * Math::PI / 180
      # The declination varies as a cosine function of the day of the year.
      # (yearday + 284) is used to align the cycle with the solstices.
      -axial_tilt_rad * Math.cos(2.0 * Math::PI / 365.0 * (yearday + 10))
    end

    # Converts the hour of the day (0-23) to an hour angle in radians.
    # The hour angle is 0 at solar noon, negative in the morning, and positive in the afternoon.
    def hour_angle(hour)
      # 15 degrees per hour, converted to radians.
      (hour - 12) * 15 * Math::PI / 180
    end

    # Calculates the solar zenith angle (the angle of the sun from the vertical).
    # This is the primary determinant of insolation intensity.
    # Returns the zenith angle in radians.
    def incident_angle(lat, yearday, hour)
      lat_rad = lat * Math::PI / 180
      decl_rad = declination_angle(yearday)
      h_angle_rad = hour_angle(hour)

      # The standard formula for the cosine of the solar zenith angle (θ).
      # cos(θ) = sin(lat)sin(δ) + cos(lat)cos(δ)cos(h)
      cos_zenith = Math.sin(lat_rad) * Math.sin(decl_rad) + Math.cos(lat_rad) * Math.cos(decl_rad) * Math.cos(h_angle_rad)

      # The zenith angle is the arccos of this value.
      # Clamp the value to the range [-1, 1] to avoid domain errors with acos.
      cos_zenith = [[cos_zenith, -1.0].max, 1.0].min
      Math.acos(cos_zenith)
    end

    # returns average W/m²
    def irradiance_daily_wm2(
      latitude,
      yearday
    )
      # Calculate the average W/m^2 over a 24-hour period by integrating the hourly flux.
      hourly_fluxes = (0..23).map do |hour|
        # Get the solar zenith angle in radians.
        zenith_angle = incident_angle(latitude, yearday, hour)

        # If the sun is below the horizon, the flux is 0.
        # zenith_angle > PI/2 means it's night.
        if zenith_angle > Math::PI / 2
          0.0
        else
          # The intensity of solar radiation is proportional to the cosine of the zenith angle.
          solar_flux = solar_irradiance_wm2(yearday) * weather_multiplier(yearday, latitude) * Math.cos(zenith_angle)
          [solar_flux, 0.0].max # Ensure flux is not negative
        end
      end

      # Return the average of all hourly fluxes for the day.
      hourly_fluxes.sum / 24.0
    end


  end

  module Atmos
    # Primitive troposphere model

    # lat is the latitude -90..0..90, negative latitude denoting southern hemisphere
    # returns a multiplier to account for weather effects (e.g., clouds).
    def weather_multiplier(_yearday, lat)
      # Simple latitude-based model: more clouds at the equator, clearer at the poles.
      # This is a rough approximation.
      0.8 + 0.15 * (lat.abs / 90.0)
    end

    # Returns average C deg
    def temp(yearday, lat, elev, _biome)
      # 1. Base temperature on latitude
      # Simple linear gradient from 25°C at equator to -15°C at poles.
      base_temp = 25.0 - 40.0 * (lat.abs / 90.0)

      # 2. Seasonal variation
      # Swing is larger at the poles (+-25°C) and smaller at the equator (+-5°C).
      swing_amplitude = 5.0 + 20.0 * (lat.abs / 90.0)
      # Northern hemisphere summer is around day 172, southern around day 356.
      # We shift the sine wave so that the peak aligns with the summer solstice.
      season_offset = lat >= 0 ? -80.5 : 102.0 # -80.5 for NH, 102 for SH
      seasonal_variation = sinus2range(yearday + season_offset, 365, swing_amplitude, -swing_amplitude)

      # 3. Elevation effect (lapse rate)
      # Temperature decreases by ~6.5°C per 1000m.
      lapse_rate = 6.5 / 1000.0
      elevation_effect = elev * lapse_rate

      # 4. Combine and clamp
      final_temp = base_temp + seasonal_variation - elevation_effect
      final_temp.clamp(-90.0, 60.0)
    end

    # Air pressure at elevation
    # returns hectopascals, (P_air units is hPa).
    def pressure(yearday, lat, elev)
      # from https://www.omnicalculator.com/physics/air-pressure-at-altitude
      # theta temp should be cald'd
      kelvin_zero = 273.15
      t_K = temp(yearday, lat, elev, 1) + kelvin_zero
      P_air * Math.exp(-G * elev * M_air / (R_air * t_K))
    end

    # Returns mm/sqkm
    def rain(_yearday, _lat, _elev, _biome)
      # biome adjust
      # http://earthobservatory.nasa.gov/Experiments/Biome/
      # dist from equator decreases
      # http://www-das.uwyo.edu/~geerts/cwx/notes/chap10/global_precip.gif
      # 10% bonus for southern hemi
      # low pressure gives rain
      p 'Atmos.rain is static mock.'
      1
    end

    def weather_extreme_bool
      false
    end
  end

  module Geosphere
    # source NP-2010-05-265-LaRC
    # Wm²
  end

  module Biome
    # Requires an world conf with biomes (world.yml)
    # self.biomes = _world.Universe.Earth.biomes

    # Returns a multiplier for args biome and type of adjustment
    def biome_multiplier biome_code, type
    end

    # Returns biome adjustment object.
    #	Effect multipliers for insolation due to weather,
    #	temp
    def biome_adjust_obj; end

    def fauna
    end
  end

  extend Geosphere
  extend Biome
  extend Atmos
  extend Orbit
  extend EMField
end
