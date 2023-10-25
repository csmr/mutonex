# encoding: utf-8

module Planet
  
  # Collection of modules to approximate planetary energy fluxes in ISO units.
  # TODO test suite
  # TODO render svg graph for year 2017 and 2017-2037 year periods

  # Physical Constants
  G     = 9.80665 # gravitational acceleration at sea-level, m/s²
  
  # into space
  Energy_Exradiation_IR_Total    = 239.9 # Wm²

  # Sine cycle helper method
  # starts from median towards maxima, then minima
  # posi: current position along period
  # period_len: period length, from 0
  # y_max, y_min: min/max to extrapolate sine -1..1
  # returns extrapolated sinus y value for current position x
  def self.sinus2range posi, period_len, y_max, y_min
    posi = posi.to_f / period_len.to_f * (2*Math::PI);
    val = Math.sin( posi.to_f );
    dist = y_max - y_min
    y_min + (1+val)/2 * dist
  end

  # Net energy available on surface
  # Wm²
  def self.energy_transmitted yearday, lat
    Atmos::Solar_Transmission * insolation_multiplier(yearday, lat)
  end

  module EMField
    # The actual direct solar irradiance at the top of the atmosphere fluctuates by
    # about 6.9% during a year (from 1.412 kW/m² in early January to 1.321 kW/m² in 
    # early July) due to the Earth's varying distance from the Sun, and typically
    # by much less than 0.1% from day to day.

    SolarConstant = 1367 # W/m2
    SolarConstantVariance = 1 # solar minima+ / maxima-

    # yearday is the day of the year 1..365
    # returns multiplier 0..2
    def solar_cycle yearday
      # Schwabe cycle of 10.66 a, Gleisberg 88 a, Devries 208 a, Eddy 1000 a
      # last maxima july 1990, feb 2001 -> next maxima 2011 
      # SolarConstant + sinus2range( days % 10.66, 10.66, -SolarConstantVariance,
      # SolarConstantVariance )
      # todo normalize to nearest maxima
      p "EMField.solar_cycle is static sunspot mock."
      0.999
    end

    # returns what?
    def space_weather yearday
      # solar wind
      # magnetic storms
      1
    end

    # lat is the latitude -90..0..90, negative latitude denoting southern hemisphere
    # arg yearday 1..365
    # returns kWh/d/m²
    def solar_irradiance_kwh yearday, lat
      si_24h_kWh = (24 * SolarConstant.to_f)/1000.0
      si_24h_kWh *
        solar_cycle(yearday) * 
        orbital_effect(yearday) * 
        axis_tilt_daylength_effect(lat, yearday) * 
        incident_angle_effect(lat, yearday)
    end


    def insolation_multiplier yearday, lat
      p "L" + lat.to_s + " yd " + yearday.to_s
      # https://en.wikipedia.org/wiki/File:Insolation.png
      solar_irradiance_kwh(yearday, lat)
    end

    def uv_influx yearday, long, lat, elevation
      p "EMField.uv multiplier mock is static"
      uv_multiplier = 1
      insolation(yearday, long, lat, elevation) * uv_multiplier
    end

  end

  module Orbit

    #	Calculates the daylength (compared to 1 = 24h)
    #	arg day of year 1..365
    #	returns multiplier
    def orbital_effect yearday
      # Orbit eccentricity:
      # sine wave period of 365 d, modulating day length by 0..-7,66m..0..+7,66 minutes
      # Orbit obliquity: 
      # sine wave period of 182.5 d, modulates day length by 0..-9,87..0..+9,87 minutes
      orb_ecce = sinus2range( yearday, 365, -7.66, 7.66 )
      orb_obli = sinus2range( yearday, 182.5, -9.87, 9.87 )
      (orb_ecce + orb_obli) / (24*60) + 1
    end

    # daylength, multiplier
    #	lat 90..0..-90 - southern latitudes negative
    #	returns -1..1
    def axis_tilt_daylength_effect lat, yearday
      # Causes season
      # Earth’s current tilt angle is approximately 23.5 degrees.
      # -> daylenght varies -> more sunshine in the summer for north
      # Hat-top cycle ver 1:
      # sine wave period of 365d, modulates day lenght by latitudal distance multi
      # note: offset results by substracting from yearday
      require 'date'

      # equinox on Mar 20th 
      days_to_solar_equinox_from_new_years = Date.civil(2020, 03, 20).yday

      # Sinus Offset
      # sinus peaks at first quarter of the scale, summer peaks at halfway (NH) or
      # end (SH) of the scale
      # offset for sinus func (max in jun)
      yearday_adjusted = (yearday - days_to_solar_equinox_from_new_years) % 365

      # Determine start of year for latitude - days begin to longen (start of sinus)
      hemisphere_multi = (lat > 0 ? 0 : 1)
      # offset for lat (summer in dec on antarctica)
      yearday_adjusted = hemisphere_multi * -182.5 + yearday_adjusted

      # Determine daylength extremes
      lat_arctic_circle = 66.533 # 66 deg 32 min
      lat_daylen_offset = ( lat.to_f / lat_arctic_circle ).abs # 0...1.5
      lat_daylen_offset = 1 unless lat_daylen_offset < 1 # 0..1
      day_max_len = 12 + 12 * lat_daylen_offset # 12..24
      day_min_len = 12 - 12 * lat_daylen_offset # 0..12

      # Should return day length multiplier 0..1,
      # - so case "10h/day" --> solar irradiance multiplier ~0.84 (shines most of day)
      sinus2range(yearday_adjusted, 365, day_max_len, day_min_len ) / 24
    end

    def incident_angle_effect lat, yearday
      1 - sinus2range( lat.abs.to_f, 360, 0.9, 0 ) # ruff approx
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
    Solar_Transmission      = 240.5 # source ?
    Reflection_Atmos        = 77.0 
    Absorption_Influx       = 77.1 
    Absorption_Geosp_IR     = 358.2

    # Outgoing Longwave Radiation
    Exradiation_IR_Atmos    = 169.9
    Exradiation_IR_Clouds   = 29.9
    Exradiation_IR_Geosp    = 40.1

    # Returns average C deg
    def temp yearday, lat, elev, biome
      # Average temperature is 15 C according to NASA
      # Low Vostok -89.2 C, High Lut Desert 70.7 C
      # -> +-60C norm, if weather extreme, multiply by 1.25
      # -> +-80C max
      # elev loss
      # biome
      p "Atmos.temp is wip @ 15 C"
      15
    end

    # Air pressure at elevation
    # returns hectopascals, (P_air units is hPa).
    def pressure yearday, lat, elev
      # from https://www.omnicalculator.com/physics/air-pressure-at-altitude
      # theta temp should be cald'd
      kelvin_zero = 273.15
      t_K = temp( yearday, lat, elev, 1) + kelvin_zero 
      P_air * Math.exp( -G*elev*M_air / (R_air * t_K) )
    end

    # Returns mm/sqkm
    def rain yearday, lat, elev, biome
      # biome adjust
      # http://earthobservatory.nasa.gov/Experiments/Biome/
      # dist from equator decreases
      # http://www-das.uwyo.edu/~geerts/cwx/notes/chap10/global_precip.gif
      # 10% bonus for southern hemi
      # low pressure gives rain
      p "Atmos.rain is static mock."
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
    def self.biome_adjust biome_code, type
      if type == "insolation"
      elsif type == "temp"
      elsif type == "rain"
        # sea averages near 12C
      end
    end

    # Returns biome adjustment object.
    #	Effect multipliers for insolation due to weather,
    #	temp
    def self.get_biome_adjust
    end

    def fauna
      # TODO
    end
  end

  module Tests

    # Run tests with '$ ruby planet.rb'.
    # run_tests method executes all test_* methods.

    def test_sinus2range
      [[0, 1], [0.75, 3], [1.5, 1], [2.25, -1], [3, 1]].all? { |n|
        _res = sinus2range(n[0], 3, 3, -1).round(3)
        # p "s2r result: " + _res.to_s + " vs " + n[1].to_f.to_s
        n[1].to_f == _res
      }
    end

    def test_energy_transmitted
      p "make test for energy_transmitted"
      energy_transmitted(rand * 365, -90 + rand*180).class == Float
    end

    def test_solar_cycle
      _res = solar_cycle(rand * 365)
      _res.class == Float && _res <= 2 && _res >= 0
    end

    def test_space_weather
      p "make test for space_weather -method"
      true # no test
    end

    def test_orbital_effect
      _res = orbital_effect( rand * 365 )
      _res.class == Float && _res >= 1420.0/1440 && _res <= 1460.0/1440
    end

    def test_axis_tilt_daylength_effect
      _res = axis_tilt_daylength_effect( -90 + rand*180, rand * 365 )
      _res.class == Float && _res >= 0 && _res <= 2
    end

    def test_incident_angle_effect
      p "Incident angle effect test is mock."
      _res = incident_angle_effect( -90 + rand*180, 100000 )
      _res.class == Float && _res >= 0 && _res <= 1
    end

    def test_solar_irradiance
      # the average incoming solar radiation, considering incident angle and half
      # the planet doesn't receive radiation, is 1/4 the solar constant ~340 W/m²
      # the daily average irradiance for Earth is approx 250 W/m2, 6 kWh/m2/d
      # source?
      _res = solar_irradiance_kwh( rand * 365, rand * 90 )
      p "solar irradiance: #{_res} kwh"
      _res.class == Float && _res >= 0 && _res < (Planet::EMField::SolarConstant * 20)/1000
    end

    def test_insolation_multiplier
      _res = insolation_multiplier( rand * 365, -90 + rand*180)
      p "insolation multiplier: #{_res}"
      _res.class == Float && _res >= 0 && _res < Planet::EMField::SolarConstant * 0.75
    end

    # def test_uv_influx yearday, long, lat, elevation
    # def test_orbital_effect yearday
    # def test_atmospheric_effect
    # def test_atmospheric_tide yearday
    def test_pressure
      _res = pressure( rand * 365, -90 + rand*180, rand*100 )
      p "Airpressure: #{_res} hPA."
      ( # hPa @ Typhoon Tip, Pacific 12.10.1979.
       _res > 870 &&
       # hPa @ Tosontsengel, Mongolia 19.12.2001.
      _res < 1085
      )
    end

    # def test_temp yearday, lat, elev, biome
    # def test_rain yearday, lat, elev, biome
    # def test_weather_extremes yearday
    # def test_biome_adjust biome_code, type
    # def test_fauna

    # def render_line_graph_for_period year-range

    private 
    def run_tests
      puts "Testrun for " + name
      res = Tests.instance_methods.all?{|m|
        _r = send(m)
        puts ">> #{m.to_s} pass: #{_r.to_s}"
        _r 
      } 
      puts (res ? "Super! Tests pass." : "Fail!!! Test(s) not passing.")
    end

  end

  extend EMField, Orbit, Atmos, Biome, Geosphere, Tests
  #require 'pry'#binding.pry
  run_tests

end

include Planet
