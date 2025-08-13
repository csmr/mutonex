require_relative './planet'
module Planet
  module Tests
    # Run tests with '$ ruby planet_tests.rb'.
    # run_tests method executes all test_* methods.

    def test_sinus2range
      cases = [[0, 1], [0.75, 3], [1.5, 1], [2.25, -1], [3, 1]]
      cases.all? do |n|
        res = sinus2range(n[0], 3, 3, -1).round(3)
        n[1].to_f == res
      end
    end

    def test_annuum
      # This test calculates and displays average daily insolation (W/m^2) and
      # average temperature (°C) for each 10-degree latitude band for each month.

      require 'date'

      latitudes = (-90..80).step(10).to_a.reverse
      months = (1..12).to_a

      monthly_data = Array.new(latitudes.size) { Array.new(months.size) }

      latitudes.each_with_index do |lat, lat_index|
        months.each_with_index do |month, month_index|
          start_date = Date.new(2023, month, 1)
          end_date = Date.new(2023, month, -1)
          num_days = end_date.day

          daily_irradiances = []
          daily_temps = []
          (start_date.yday..end_date.yday).each do |yearday|
            daily_irradiances << irradiance_daily_wm2(lat, yearday)
            daily_temps << temp(yearday, lat, 0, 0) # Sea level temperature
          end

          monthly_data[lat_index][month_index] = {
            irradiance: daily_irradiances.sum / num_days,
            temperature: daily_temps.sum / num_days
          }
        end
      end

      # --- Print the results as a formatted table ---
      puts "\n--- Annual Simulation Summary: Avg W/m² (Avg Temp °C) ---\n"
      month_names = Date::ABBR_MONTHNAMES[1..12]
      printf "%-6s", "Lat"
      month_names.each { |m| printf "%-12s", m }
      puts "\n" + "-" * 150

      latitudes.each_with_index do |lat, lat_index|
        printf "%+3d° | ", lat
        monthly_data[lat_index].each do |data|
          printf "%-12s", "#{data[:irradiance].round(0)} (#{data[:temperature].round(1)})"
        end
        puts
      end
      puts "-" * 150

      true
    end

    def test_irradiance_daily_wm2
      # This test checks if the output of the main energy function is within a plausible physical range
      # for different latitudes and times of year.
      cases = [
        # lat, day, expected_min, expected_max
        [0, 80, 300, 400],     # Equator at equinox: high irradiance
        [90, 172, 450, 550],   # North Pole at summer solstice (near aphelion): highest irradiance
        [90, 356, 0, 0],       # North Pole at winter solstice: zero irradiance
        [-90, 172, 0, 0],      # South Pole at winter solstice: zero irradiance
        [45, 172, 350, 450],   # Mid-latitude at summer solstice (near aphelion)
        [45, 356, 50, 150]     # Mid-latitude at winter solstice
      ]

      cases.all? do |lat, day, min, max|
        res = irradiance_daily_wm2(lat, day)
        pass = res.is_a?(Float) && res.between?(min, max)
        unless pass
          puts "FAIL: lat=#{lat}, day=#{day}. Got #{res.round(2)}, expected #{min}..#{max}"
        end
        pass
      end
    end

    def test_solar_cycle
      res = solar_cycle(rand * 365)
      res.class == Float && res <= 2 && res >= 0
    end

    def test_space_weather
      true # no test
    end

    def test_orbital_effect
      # The orbital effect models the ~3.4% variation in solar intensity due to orbital eccentricity.
      # The multiplier should be between ~0.966 and ~1.034.
      range_pass = (0..365).all? { |day| orbital_effect(day).between?(0.966, 1.034) }

      # Check that perihelion (day 3) has higher effect than aphelion (day 185)
      phase_pass = orbital_effect(3) > orbital_effect(185)

      range_pass && phase_pass
    end

    def test_solar_irradiance
      res = solar_irradiance_wm2(rand * 365)
      res.class == Float && res < Solar_Constant * Solar_Constant_Range
    end

    def test_pressure
      res = pressure(rand * 365, -90 + rand * 180, rand * 100)
      (res > 870 && res < 1085)
    end

    def test_temp
      # Checks for plausible temperatures at different locations and times.
      # 1. Equator should be warmer than pole.
      t_equator = temp(80, 0, 0, 0)
      t_pole = temp(172, 90, 0, 0)
      pass1 = t_equator > t_pole

      # 2. Summer should be warmer than winter.
      t_summer = temp(172, 45, 0, 0)
      t_winter = temp(356, 45, 0, 0)
      pass2 = t_summer > t_winter

      # 3. High altitude should be colder than sea level.
      t_sea_level = temp(80, 0, 0, 0)
      t_mountain = temp(80, 0, 5000, 0)
      pass3 = t_sea_level > t_mountain

      # 4. Check against absolute min/max
      t_min = temp(356, 90, 2000, 0) # Polar winter on a plateau
      t_max = temp(172, 20, 0, 0) # Tropical summer at sea level
      pass4 = t_min.between?(-90, 60) && t_max.between?(-90, 60)

      pass1 && pass2 && pass3 && pass4
    end

    def run_tests
      puts 'Testrun for ' + self.name
      test_methods = methods.grep(/^test_/)
      results = test_methods.map do |m|
        result = send(m)
        puts ">> #{m} pass: #{result}"
        result
      end

      all_passed = results.all? { |res| res }
      puts(all_passed ? 'Super! Tests pass.' : 'Fail!!! Test(s) not passing.')
    end

  end
  extend Tests
  run_tests if $PROGRAM_NAME == __FILE__
end
