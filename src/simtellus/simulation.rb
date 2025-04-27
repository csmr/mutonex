require 'date'
require_relative 'planet'
require_relative 'logger'

module Simtellus
  SECTOR_SIZE = 10 # Degrees
  LAT_DIVISIONS = (180 / SECTOR_SIZE).to_i
  LON_DIVISIONS = (360 / SECTOR_SIZE).to_i
  DEFAULT_START_DATE = Date.new(2088, 1, 1)

  # Module for managing the state of the planet
  module State
    @@state = {}
    @@artifacts = {}
    @@start_date = nil
    @@current_date = nil

    def self.initialize_state(start_date, years_before)
      @@start_date = start_date
      @@current_date = start_date
      @@state = {}
      @@artifacts = {}

      log! "Initializing state with start date: #{start_date} and years before: #{years_before}"

      # Initialize the state with default values if needed
      (-LAT_DIVISIONS..LAT_DIVISIONS).each do |lat_index|
        (0..LON_DIVISIONS).each do |lon_index|
          lat = lat_index * SECTOR_SIZE
          lon = lon_index * SECTOR_SIZE
          sector = sector_key(lat, lon)
          @@state[sector] = { energy: 0, temperature: 15.0, rainfall: 0, historical_min_temp: 15.0, historical_max_temp: 15.0 } # Default values
        end
      end

      # Compute cumulative state for the specified number of years before the start date
      (1..years_before).each do |year|
        past_date = start_date - year * 365
        Computation.update_simulation(past_date)
      end
    end

    def self.get_state(lat, lon)
      sector = sector_key(lat, lon)
      @@state[sector]
    end

    def self.set_state(lat, lon, data)
      sector = sector_key(lat, lon)
      @@state[sector] = data
      log! "State updated for sector (#{lat}, #{lon}): #{data}"
    end

    def self.get_artifacts(lat, lon)
      sector = sector_key(lat, lon)
      @@artifacts[sector] || []
    end

    def self.add_artifact(lat, lon, artifact)
      sector = sector_key(lat, lon)
      @@artifacts[sector] ||= []
      @@artifacts[sector] << artifact
      log! "Artifact added to sector (#{lat}, #{lon}): #{artifact}"
    end

    def self.sector_key(lat, lon)
      lat_index = (lat / SECTOR_SIZE).to_i
      lon_index = (lon / SECTOR_SIZE).to_i
      "#{lat_index}_#{lon_index}"
    end

    def self.current_date
      @@current_date
    end

    def self.advance_date
      @@current_date += 1
      log! "Date advanced to: #{@@current_date}"
    end
  end

  # Module for computing the planet's state for each temporal cycle
  module Computation
    def self.compute_state_old(date, lat, lon)
      yearday = date.yday
      energy = Planet.energy_transmitted(yearday, lat)
     
      temperature = compute_temperature(date, lat, lon)
      # Add more computations as needed
      {
        energy: energy,
        temperature: temperature,
        rainfall: compute_rainfall(date, lat, lon),
        historical_min_temp: [current_state[:historical_min_temp], temperature].min,
        historical_max_temp: [current_state[:historical_max_temp], temperature].max,
        # Add more state information
      }
    end

    def self.compute_temperature_old(date, lat, lon, cumulative_temp)
      current_temp = State.get_state(lat, lon).current_state[:temperature]

      # Mock temperature approximation function
      random_offset = (rand * 2) - 1
      temp_approximation = -lon.abs / 6.0 + random_offset
      new_temp = cumulative_temp + temp_approximation
      [new_temp, -50, 50].sort[1] # Cap between -50 and 50 degrees Celsius
    end

  TEMPERATURE_PERIOD_LENGTH = 365.0 # Assuming a 365-day year
  TEMPERATURE_MAX = 50.0
  TEMPERATURE_MIN = -50.0

  def self.compute_state(date, lat, lon)
    yearday = date.yday
    historical_min_temp = [State.get_state(lat, lon)[:historical_min_temp], temperature].min
    historical_max_temp = [State.get_state(lat, lon)[:historical_max_temp], temperature].max

    state_data = {
      energy: Planet.energy_transmitted(yearday, lat) || 0,
      temperature: compute_temperature(date, lat, lon) || 0,
      rainfall: compute_rainfall(date, lat, lon) || 0,
      historical_min_temp: historical_min_temp || 0,
      historical_max_temp: historical_max_temp || 0
    }
    State.set_state(lat, lon, state_data)

    state_data
  end

  def self.compute_temperature(date, lat, lon)
    yearday = date.yday
    current_state = State.get_state(lat, lon)
    current_temperature = current_state[:temperature]

    temperature_amplitude = TEMPERATURE_MAX - TEMPERATURE_MIN
    temperature_offset = sinus2range(yearday, TEMPERATURE_PERIOD_LENGTH, TEMPERATURE_MAX, TEMPERATURE_MIN)
    temperature_latitude_adjustment = -lon.abs / 6.0

    new_temperature = current_temperature + temperature_offset + temperature_latitude_adjustment
    new_temperature = new_temperature.clamp(TEMPERATURE_MIN, TEMPERATURE_MAX)

    State.set_state(lat, lon, { temperature: new_temperature })
    new_temperature
  end

  ### New Coodz



    def self.compute_rainfall(date, lat, lon)
      # Placeholder for rainfall computation
      5.0 # Example value in mm
    end

    def self.update_simulation(date)
      log! "Updating simulation for date: #{date}"
      (-LAT_DIVISIONS..LAT_DIVISIONS).each do |lat_index|
        (-LON_DIVISIONS..LON_DIVISIONS).each do |lon_index|
          lat = lat_index * SECTOR_SIZE
          lon = lon_index * SECTOR_SIZE
          state = compute_state(date, lat, lon)
          Simtellus::State.set_state(lat, lon, state)
        end
      end
      Simtellus::State.advance_date
    end
  end

  # Factory method to instantiate the simulation
  def self.start_simulation(start_date = DEFAULT_START_DATE, years_before = 100)
    State.initialize_state(start_date, years_before)
  end
end
