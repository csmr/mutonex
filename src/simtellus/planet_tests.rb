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
      # This test calculates the average daily insolation (W/m^2) for each 10-degree
      # latitude band for each month and prints it as a table.

      require 'date'

      latitudes = (-90..80).step(10).to_a.reverse
      months = (1..12).to_a

      # Data structure to hold average W/m^2 for each lat/month
      monthly_avg_insolation = Array.new(latitudes.size) { Array.new(months.size) }

      latitudes.each_with_index do |lat, lat_index|
        months.each_with_index do |month, month_index|

          start_date = Date.new(2023, month, 1)
          end_date = Date.new(2023, month, -1)
          num_days = end_date.day

          # Sum the daily insolation values for the month
          total_monthly_power_per_sq_meter = (start_date.yday..end_date.yday).sum do |yearday|
            irradiance_daily_wm2(lat, yearday)
          end

          # Calculate the average
          average_power = total_monthly_power_per_sq_meter / num_days

          monthly_avg_insolation[lat_index][month_index] = average_power
        end
      end

      # --- Print the results as a formatted table ---

      # Header
      puts "\n--- Average Daily Insolation per Sector (W/m²) ---\n"
      month_names = Date::ABBR_MONTHNAMES[1..12]
      printf "%-5s", "Lat"
      month_names.each { |m| printf "%-8s", m }
      puts "\n" + "-" * 101

      # Body
      latitudes.each_with_index do |lat, lat_index|
        printf "%+3d° ", lat
        monthly_avg_insolation[lat_index].each do |power|
          printf "%-8d", power.to_i
        end
        puts
      end
      puts "-" * 101

      # The test passes if the calculation completes and prints.
      true
    end

    def test_irradiance_daily_wm2
      # This test checks if the output of the main energy function is within a plausible physical range
      # for different latitudes and times of year.
      cases = [
        # lat, day, expected_min, expected_max
        [0, 80, 350, 450],     # Equator at equinox: high irradiance
        [90, 172, 350, 400],   # North Pole at summer solstice (near aphelion): high irradiance
        [90, 356, 0, 0],       # North Pole at winter solstice: zero irradiance
        [-90, 172, 0, 0],      # South Pole at winter solstice: zero irradiance
        [45, 172, 350, 400],   # Mid-latitude at summer solstice (near aphelion)
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
