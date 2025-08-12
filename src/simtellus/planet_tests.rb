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
      # This test calculates the total monthly insolation for each 10-degree
      # latitude band and prints it as a table.

      require 'date'

      latitudes = (-90..80).step(10).to_a.reverse
      months = (1..12).to_a
      seconds_in_day = 86400

      # Data structure to hold total Joules for each lat/month
      monthly_insolation = Array.new(latitudes.size) { Array.new(months.size) }

      latitudes.each_with_index do |lat, lat_index|
        months.each_with_index do |month, month_index|

          # Get the start and end day of the year for the current month
          start_date = Date.new(2023, month, 1)
          end_date = Date.new(2023, month, -1)

          total_monthly_energy = (start_date.yday..end_date.yday).sum do |yearday|
            # Insolation in W/m^2 (Joules per second per m^2)
            power_per_sq_meter = energy_transmitted(yearday, lat)
            # Area of a 10x10 degree sector at this latitude
            area = sector_area(lat)
            # Total energy for one day in this sector
            power_per_sq_meter * area * seconds_in_day
          end

          monthly_insolation[lat_index][month_index] = total_monthly_energy
        end
      end

      # --- Print the results as a formatted table ---

      # Header
      puts "\n--- Monthly Insolation Energy per 10x10 deg Sector (Joules) ---\n"
      month_names = Date::ABBR_MONTHNAMES[1..12]
      printf "%-5s", "Lat"
      month_names.each { |m| printf "%-10s", m }
      puts "\n" + "-" * 125

      # Body
      latitudes.each_with_index do |lat, lat_index|
        printf "%+3d° ", lat
        monthly_insolation[lat_index].each do |energy|
          printf "%-10.2e", energy
        end
        puts
      end
      puts "-" * 125

      # The test passes if the calculation completes and prints.
      true
    end

    def test_energy_transmitted
      cases = [
        [:non_polar_latitudes,
         { max: Solar_Transmission_W * 1.5,
           latitudes: (0..66).step(6).to_a,
           dayrange: (1..365).step(5).to_a }],
        [:antarctic,
         { max: Solar_Trans_Twilight * 3,
           latitudes: (-90..-69).step(4).to_a,
           dayrange: (172..202).step(5).to_a }],
        [:arctic,
         { max: Solar_Trans_Twilight * 3,
           latitudes: (68..90).step(4).to_a,
           dayrange: (335..365).step(5).to_a }]
      ]

      cases.all? do |c, params|
        params[:latitudes].all? do |lat|
          params[:dayrange].all? do |d|
            res = energy_transmitted(d, lat)
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
      true # no test
    end

    def test_orbital_effect
      res = orbital_effect(rand * 365)
      res.class == Float && res >= 1420.0 / 1440 && res <= 1460.0 / 1440
    end

    # Tests axial tilt without incident angle effect!
    def test_axial_tilt_daylength_effect
      constraints = [ # env, comparator, tlen, params
        [:polar_night, :<, 1.to_f / 24, [ # < 1 h
          # North pole, September 24 - December 22
          { lat: 90, start: 268, end: 357 },
          # South pole, March 22 - June 20
          { lat: -90, start: 82, end: 170 }
        ]],
        [:polar_day, :>, 23.to_f / 24, [ # > 23 h
          # North pole, March 22 - September 21
          { lat: 90, start: 82, end: 265 },
          # South pole, Dec 22 - Dec 31
          { lat: -90, start: 356, end: 366 },
          # South pole, Jan 1 - Mar 21
          { lat: -90, start: 1, end: 81 }
        ]],
         [:equatorial_day, :>, 11.to_f / 24, [ # ~12 h
           # Equator, January 1 - June 30
           [{ lat: 0, start: 1, end: 180 }]
         ]]
      ]
      constraints.all? do |env, comparator, tlen, params|
        params.all? do |par|
          (par[:start]...par[:end]).all? do |yearday|
            res = axial_tilt_daylength_effect(par[:lat], yearday)
            res.send(comparator, tlen)
          end
        end
      end
    end

    def test_incident_angle_effect
      cases = {
        equatorial_summer: { lat: 0, day: 170 },
        northpole_equinox: { lat: 90, day: EQUINOX_DAY_N }
      }
      cases.all? do |_c, params|
        res = incident_angle_effect(params[:lat], params[:day])
        res.class == Float &&
          res.between?(0, 1)
      end
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
      res = methods.grep(/^test_/).all? do |m|
        res = send(m)
        puts ">> #{m} pass: #{res}"
        res
      end
      puts(res ? 'Super! Tests pass.' : 'Fail!!! Test(s) not passing.')
    end

  end
  extend Tests
  run_tests if $PROGRAM_NAME == __FILE__
end
