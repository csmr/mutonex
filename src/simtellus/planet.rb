module Planet
  # Collection of modules to approximate planetary energy fluxes in ISO units.
  # TODO test suite
  # TODO render svg graph for year 2017 and 2017-2037 year periods

  # Physical Constants
  G = 9.80665 # gravitational acceleration at sea-level, m/s²

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

  # Net energy available on surface
  # Wm²
  # the average incoming solar radiation, considering incident angle and half
  # the planet doesn't receive radiation, is 1/4 the solar constant ~340 W/m²
  # the daily average irradiance for Earth is approx 250 W/m2, 6 kWh/m2/d
  def self.energy_transmitted(yearday, lat)
    solar_irradiance_wm2(yearday) *
      weather_multiplier(yearday, lat)
  end

  module EMField
    # The actual direct solar irradiance at the top of the atmosphere fluctuates by
    # about 6.9% during a year (from 1.412 kW/m² in early January to 1.321 kW/m² in
    # early July) due to the Earth's varying distance from the Sun, and typically
    # by much less than 0.1% from day to day.

    Solar_Constant = 1367 # W/m2
    Solar_Constant_Range = 1.069 # solar minima+ / maxima-

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

    # returns what?
    def space_weather(_yearday)
      # solar wind
      # magnetic storms
      1
    end

    # arg yearday 1..365
    # returns W/m²
    def solar_irradiance_wm2(yearday)
      EMField::Solar_Constant *
        solar_cycle(yearday) *
        orbital_effect(yearday)
    end

    # returns Wm
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
    require 'date'

    # equinox on Mar 20th
    EQUINOX_DAY_N = Date.civil(2020, 3, 20).yday
    AXIAL_TILT = 23.5

    # Axial tilt multiplier
    # -> daylenght varies -> seasons, more sunshine in the summer
    #	lat 90..0..-90 - southern latitudes negative
    #	returns 0..1, 0.5 == 12h
    def axial_tilt_daylength_effect(lat, yearday)
      # Hat-top cycle ver 1:
      # sine wave period of 365d, modulates day lenght by latitudal distance multi
      # note: offset results by substracting from yearday

      # offset for sinus func
      # sinus peaks at first quarter of the scale, summer peaks at halfway (NH) or
      # end (SH) of the scale
      yearday_adjusted = (yearday - EQUINOX_DAY_N) % 365

      # Determine start of year for latitude - days begin to longen (start of sinus)
      hemisphere_multi = (lat.positive? ? 0 : 1)
      # offset for lat (summer in dec on antarctica)
      yearday_adjusted = hemisphere_multi * -182.5 + yearday_adjusted

      # axial tilt effect follows sine
      # tilt is 0 on equinox, 23.5 deg on solistice
      t = ((180 - AXIAL_TILT) / 180) * hemisphere_multi
      t_m = at * ((yearday%182) - EQUINOX_DAY_N)

      # Determine daylength extremes
      lat_arctic_circle = 66.533 # 66 deg 32 min
      lat_daylen_offset = (lat.to_f / lat_arctic_circle).abs
      lat_daylen_offset = 1 if lat_daylen_offset > 1 # 0..1
      day_max_len = 12 + 12 * lat_daylen_offset # 12..24
      day_min_len = 12 - 12 * lat_daylen_offset # 0..12

      sinus2range(yearday_adjusted, 365, day_max_len, day_min_len) / 24
    end

    # Incident angle effect on insolation:
    #   I = I_max * cos(θ)
    # Returns 0..1, multi
    def incident_angle_effect(lat, _yearday)
      # ruff approx, sinus2range param always in first quarter of sine
      # gives sinusoidal range 0-0.9
      1 - sinus2range( lat.abs.to_f, 360, 0.99, 0 ) # ruff approx
    end

    #	Calculates the daylength (compared to 1 = 24h)
    #	arg day of year 1..365
    #	returns multiplier
    def orbital_effect(yearday)
      # Orbit eccentricity:
      # sine wave period of 365 d, modulating day length by 0..-7,66m..0..+7,66 minutes
      # Orbit obliquity:
      # sine wave period of 182.5 d, modulates day length by 0..-9,87..0..+9,87 minutes
      orb_ecce = sinus2range(yearday, 365, -7.66, 7.66)
      orb_obli = sinus2range(yearday, 182.5, -9.87, 9.87)
      (orb_ecce + orb_obli) / (24 * 60) + 1
    end

  ############################ NEW CODE

    require 'numeric'

    # Possibly refactor these to be closures to be passed into daily_insolation, if that improves computation
    def declination_angle(yearday)
      # Calculate the day of the year
      day = Date.new(2023, 1, 1).yday + yearday

      # Calculate the declination using the equation
      calculate_orbit(day) + 0.0001
    end

    def calculate_orbit(yearday)
      # Calculate the angle of Earth's orbit around the sun
      angle = yearday * (2 * Math::PI) / 365.2422

      # Normalize the angle to between 0 and 2π
      angle %= (2 * Math::PI)

      angle
    end

    # return deg
    def incident_angle(lat, yearday, hour)
      declination_angle(lat, yearday) + hour
    end

    def daily_insolation(
      latitude,
      yearday,
      time_resolution: 1,
      baseline_solar_irradiation: 0.25
    )
      # cumulative flux
      0..24.sum do |hour|
        incident_deg = incident_angle(yearday, latitude)
        # Skip twilight hours
        next if incident_deg.negative?

        solar_flux = (solar_irradiance_wm2 * weather_multiplier) * Math.cos(incident_angle(lat, yearday, hour))**2
        solar_flux = 0 if solar_flux.abs < 0.01
        solar_flux * (time_resolution / 2.0)
      end
    end


  end

  module Atmos
    # Primitive troposphere model

    M_air = 0.0289644 # air molar mass, kg/mol
    P_air = 1013.25 # air pressure at sea-level, hectoPascals
    R_air = 8.31432 # gas constant, Nm/molK
    C_p_air = 2.37789552 # specific heat capacity Jkg/K

    # source NP-2010-05-265-LaRC
    # Planetary sphere surface flux, Wm²
    Solar_Influx            = 340.4
    Solar_Influx_Reflected  = 99.9 # into space
    Solar_Transmission_W    = 240.5 # source ?
    Solar_Trans_Twilight    = 10 # source ?
    Reflection_Atmos        = 77.0
    Absorption_Influx       = 77.1
    Absorption_Geosp_IR     = 358.2

    # Outgoing Longwave Radiation
    Exradiation_IR_Atmos    = 169.9
    Exradiation_IR_Clouds   = 29.9
    Exradiation_IR_Geosp    = 40.1

    # lat is the latitude -90..0..90, negative latitude denoting southern hemisphere
    # returns 0..1, 0.5 is 12h at equator
    def weather_multiplier(yearday, lat)
      # https://en.wikipedia.org/wiki/File:Insolation.png
      # weather *
      # extreme_weather *
      # biome *
      # p 'weather multiplier is mock'
      1
    end

    # Returns average C deg
    def temp(_yearday, _lat, _elev, _biome)
      # Average temperature is 15 C according to NASA
      # Low Vostok -89.2 C, High Lut Desert 70.7 C
      # -> +-60C norm, if weather extreme, multiply by 1.25
      # -> +-80C max
      # elev loss
      # biome
      p 'Atmos.temp is wip @ 15 C'
      15
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
    # into geosphere
    Net_Absorption = 0.6 # Wm² absorbed
    Solar_Influx_Absorption   = 163.3 # solar influx absorbed
    Solar_Influx_Reflected    = 22.9
    Atmospheric_Backradiation = 340.3

    # into atmos
    Exradiation_Surface       = 398.2
    Exconvection_Exconduction = 18.4
    Ex_Latent_Heat            = 86.4
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
