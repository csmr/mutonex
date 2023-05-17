# encoding: utf-8

module Planet

  # TODO test suite
  # TODO render svg graph for year 2017 and 2017-2037 year periods

  # Physical Constants
  G     = 9.80665 # gravitational acceleration at sea-level, m/s²
  M_air = 0.0289644 # air molar mass, kg/mol
  P_air = 1013.25 # air pressure at sea-level, hectoPascals
  R     = 8.31432 # gas constant, Nm/molK

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

  module EMField
    # The actual direct solar irradiance at the top of the atmosphere fluctuates by about 6.9% during a year (from 1.412 kW/m² in early January to 1.321 kW/m² in early July) due to the Earth's varying distance from the Sun, and typically by much less than 0.1% from day to day.
    # about 13% of that solar radiation may be absorbed by the atmosphere and 13% scattered.

    SolarConstant = 1367 # W/m2
    SolarConstantVariance = 1 # solar minima+ / maxima-

    # yearday is the day of the year 1..365
    # returns multiplier 0..2
    def solar_cycle yearday
      #sunspots
      # cycle of 10.66 years
      # last maxima july 1990, feb 2001 -> next maxima 2011 
      # SolarConstant + sinus2range( days % 10.66, 10.66, -SolarConstantVariance,SolarConstantVariance ) # todo normalize to nearest maxima
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
    # returns kWh/d
    def solar_irradiance yearday, lat
      # the average incoming solar radiation, taking into account the angle at which the rays strike and that at any one moment half the planet does not receive any solar radiation, is one-fourth the solar constant (approximately 340 W/m²)
      # the daily average irradiance for the Earth is approximately 250 W/m2 (i.e., a daily irradiation of 6 kWh/m2)
      #  solar irradiance does vary with distinct periodicities such as: 11 years (Schwabe), 88 years (Gleisberg cycle), 208 years (DeVries cycle) and 1,000 years (Eddy cycle)
      si_24h_kWh = SolarConstant.to_f * 24/1000.0

      si_24h_kWh *
        solar_cycle(yearday) * 
        orbital_effect(yearday) * 
        axis_tilt_daylength_effect(lat, yearday) * 
        incident_angle_effect(lat, yearday) *
        atmospheric_insolation_reduction
    end

    def insolation yearday, lat
      p "L" + lat.to_s + " yd " + yearday.to_s
      # https://en.wikipedia.org/wiki/File:Insolation.png
      solar_irradiance(yearday, lat)
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

      days_to_solar_equinox_from_new_years = Date.civil(2020, 03, 20).yday # equinox on Mar 20th 

      # Sinus Offset
      # sinus peaks at first quarter of the scale, summer peaks at halfway (NH) or end (SH) of the scale
      yearday_adjusted = (yearday - days_to_solar_equinox_from_new_years) % 365 # offset for sinus func (max in jun)

      # Determine start of year for latitude - days begin to longen (start of sinus)
      hemisphere_multi = (lat > 0 ? 0 : 1)
      yearday_adjusted = hemisphere_multi * -182.5 + yearday_adjusted # offset for lat (summer in dec on antarctica)

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
      # -- From http://www.itacanet.org/the-sun-as-a-source-of-energy/part-2-solar-energy-reaching-the-earths-surface/:
      # -- the irradiance intensity on the horizontal plane can be calculated from: I_0h = cos theta_Z (2.2)
      # -- theta_Z = declination (solar zenith angle)
      # -- I_0h = extraterrestial irradiance intensity
      # Polar caps get about one quarter of the irradiation the equator does.
      axis_tilt_angle_rad = 23.45 * ( Math::PI/180 )

      solar_declination_angle_rad = axis_tilt_angle_rad * Math.cos( (2*Math::PI*360)/365 * (19+yearday) ) # for day

      # angle_of_incident = alt-angle-sine - declination-sine * latitude-sine / declination-cos * latitude-cos
      1 - sinus2range( lat.abs.to_f, 360, 0.9, 0 ) # ruff approx
    end

  end

  module Atmos

    AtmosphericAbsorbance = 0.23 # lost, of total of 1
    AtmosphericScatter = 0.13 

    # Effect of atmosphere on irradiation influx
    # multiplier
    def atmospheric_insolation_reduction
      1 - AtmosphericAbsorbance - AtmosphericScatter
    end

    # Air pressure at elevation
    #  P_sealevel * exp(-g_acc*air_molar_mass*h/R_gasconst*temperature)
    # returns hectopascals, if P_air is in hPa.
    def airpressure yearday, lat, elev
      P_air * Math.exp( G*M_air*elev / R * temp( yearday, lat, elev, 1) )
    end

    # Returns average C deg
    def temp yearday, lat, elev, biome
      # Average temperature is 15 C according to NASA
      # Low Vostok -89.2 C, High Lut Desert 70.7 C
      # -> +-60C norm, if weather extreme, multiply by 1.25
      # -> +-80C max
      # https://en.wikipedia.org/wiki/Potential_temperature
      # norm + (vari * insolation - elevation - biome_adjust)
      p "Atmos.temp is static mock."
      15
    end

    # Returns mm/sqkm
    def rain yearday, lat, elev, biome
      # biome adjust
      # http://earthobservatory.nasa.gov/Experiments/Biome/
      # dist from equator decreases http://www-das.uwyo.edu/~geerts/cwx/notes/chap10/global_precip.gif
      # 10% bonus for southern hemi
      # low pressure gives rain
      p "Atmos.rain is static mock."
      1
    end

    def weather_extremes yearday
      # has?
    end
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
      _res = incident_angle_effect( -90 + rand*180, 100000 )
      _res.class == Float && _res >= 0 && _res <= 1
    end

    def test_solar_irradiance
      _res = solar_irradiance( rand * 365, rand * 90 )
      p _res
      _res.class == Float && _res >= 0 && _res < (Planet::EMField::SolarConstant * 20)/1000
    end

    def test_insolation
      _res = insolation( rand * 365, -90 + rand*180)
      p _res
      _res.class == Float && _res >= 0 && _res < Planet::EMField::SolarConstant * 0.75
    end

    # def test_uv_influx yearday, long, lat, elevation
    # def test_orbital_effect yearday
    # def test_atmospheric_effect
    # def test_atmospheric_tide yearday
    # def test_airpressure yearday, lat, elev, biome
    # def test_temp yearday, lat, elev, biome
    # def test_rain yearday, lat, elev, biome
    # def test_weather_extremes yearday
    # def test_biome_adjust biome_code, type
    # def test_fauna

    # def render_line_graph_for_period year-range

    private 
    def run_tests
      puts "Testrun for " + name
      res = Tests.instance_methods.all?{|m| _r = send(m); puts m.to_s + " pass: " + _r.to_s; _r } 
      puts (res ? "Super! Tests pass." : "Fail!!! Test(s) not passing.")
    end

  end

  extend EMField, Orbit, Atmos, Biome, Tests
  #require 'pry'#binding.pry
  run_tests

end

include Planet
