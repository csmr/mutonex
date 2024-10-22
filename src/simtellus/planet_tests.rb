require_relative './planet'
module Planet
  module Tests
    # Run tests with '$ ruby planet_tests.rb'.
    # run_tests method executes all test_* methods.

    def test_sinus2range
      cases = [[0, 1], [0.75, 3], [1.5, 1], [2.25, -1], [3, 1]]
      cases.all? do |n|
        res = sinus2range(n[0], 3, 3, -1).round(3)
        # p "s2r result: " + res.to_s + " vs " + n[1].to_f.to_s
        n[1].to_f == res
      end
    end

    def test_annuum
      # Print a table containing insolation & temp
      # for each month and each 10 deg lat
      p "test_annuum is a static mock"
      return true
    end

    def test_energy_transmitted
      cases = [
        [:non_polar_latitudes,
         { max: Atmos::Solar_Transmission_W * 1.5,
           latitudes: (0..66).step(6).to_a,
           dayrange: (1..365).step(5).to_a }],
        [:antarctic,
         { max: Atmos::Solar_Trans_Twilight * 3,
           latitudes: (-90..-69).step(4).to_a,
           dayrange: (172..202).step(5).to_a }],
        [:arctic,
         { max: Atmos::Solar_Trans_Twilight * 3,
           latitudes: (68..90).step(4).to_a,
           dayrange: (335..365).step(5).to_a }]
      ]

      #require 'pry'
      #binding.pry if c == :antarctic
      cases.all? do |c, params|
        params[:latitudes].all? do |lat|
          params[:dayrange].all? do |d|
            res = energy_transmitted(d, lat)
            p c, lat, d, res, params[:max] unless res < params[:max]
            res.class == Float && res < params[:max]
          end
        end
      end
    end

    def test_solar_cycle
      res = solar_cycle(rand * 365)
      res.class == Float && res <= 2 && res >= 0
    end

    def test_space_weather
      p 'make test for space_weather -method'
      true # no test
    end

    def test_orbital_effect
      # Should return day length multiplier 0..1,
      # - so case "10h/day" --> solar irradiance multiplier ~0.84 (shines most of day)
      res = orbital_effect(rand * 365)
      res.class == Float && res >= 1420.0 / 1440 && res <= 1460.0 / 1440
    end

    # Tests axial tilt without incident angle effect!
    def test_axial_tilt_daylength_effect
      constraints = [ # nn, len, pars
        [:polar_night, 1.to_f / 24, [ # < 1 h
          # North pole, September 24 - December 22
          { lat: 90, start: 268, end: 357 },
          # South pole, March 22 - June 20
          { lat: -90, start: 82, end: 170 }
        ]],
        [:polar_day, 23.to_f / 24, [ # > 23 h
          # North pole, March 22 - September 21
          { lat: 90, start: 82, end: 265 },
          # South pole, December 22 - December 30
          { lat: -90, start: 357, end: 264 },
          # South pole, January 1 - March 21
          { lat: -90, start: 1, end: 82 }
        ]],
         [:equatorial_day, 11.to_f / 24, # ~12 h
         # Equator, January 1 - June 30
         [{ lat: 0, start: 1, end: 180 }]]
      ]
      constraints.all? do |env, tlen, params|
        params.all? do |par|
          (par[:start]...par[:end]).all? do |yearday|
            res = axial_tilt_daylength_effect(par[:lat], yearday)
            p "#{env}: #{res} vs #{tlen} @ #{par[:lat]} deg #{yearday} d"
            p 'must combine axial tilt and incident effect funcs'
            p 'two different comparison cases < and >'
            p 'wrong answer for axial tilt'
            # res.send((env == :polar_night ? :< : :>), tlen)
            (res <= tlen)
          end
        end
      end
    end

    def test_incident_angle_effect
      cases = {
        equatorial_summer: { lat: 0, day: 170 },
        northpole_equinox: { lat: 90, day: Orbit::EQUINOX_DAY_N }
      }
      cases.all? do |_c, params|
        res = incident_angle_effect(params[:lat], params[:day])
        res.class == Float &&
          res.between?(0, 1) # What is the correct value for minimum?
      end
    end

    def test_solar_irradiance
      # source?
      # todo
      res = solar_irradiance_wm2(rand * 365)
      p "solar irradiance: #{res} wm2"
      res.class == Float &&
        # res > EMField::Solar_Constant - (1/EMField::Solar_Constant_Range*2) &&
        res < EMField::Solar_Constant * EMField::Solar_Constant_Range
    end

    def test_insolation_multiplier
      cases = {
        equator_summer: { lat: 0, day: 170 },
        northpole_equinox: { lat: 90, day: Orbit::EQUINOX_DAY_N }
      }
      cases.all? do |c, p|
        res = insolation_multiplier(p[:day], p[:lat])
        p "insolation multiplier: #{c} #{res} @ d #{p[:day]}, #{p[:lat]} deg"
        res.instance_of?(Float) &&
          res.between?(0, 1)
      end
    end

    # def test_uv_influx yearday, long, lat, elevation
    # def test_orbital_effect yearday
    # def test_atmospheric_effect
    # def test_atmospheric_tide yearday
    def test_pressure
      res = pressure(rand * 365, -90 + rand * 180, rand * 100)
      p "Airpressure: #{res} hPA."
      ( # hPa @ Typhoon Tip, Pacific 12.10.1979.
       res > 870 &&
      # hPa @ Tosontsengel, Mongolia 19.12.2001.
      res < 1085
     )
    end

    # def test_temp yearday, lat, elev, biome
    # def testresain yearday, lat, elev, biome
    # def test_weather_extremes yearday
    # def test_biome_adjust biome_code, type
    # def test_fauna

    # def render_line_graph_for_period year-range
    def run_tests
      puts 'Testrun for ' + name 
      res = methods.grep(/^test_/).all? do |m|
        res = send(m)
        puts ">> #{m} pass: #{res}"
        res
      end
      puts(res ? 'Super! Tests pass.' : 'Fail!!! Test(s) not passing.')
    end

  end
  #require 'pry'
  #binding.pry
  extend Tests
  run_tests if $PROGRAM_NAME == __FILE__
end
