require_relative 'simulation'
require_relative 'logger'

module Simtellus
  module Tests
    # Run tests with '$ ruby simulation_tests.rb'.
    # run_tests method executes all test_* methods.

    def run_tests
      initialize_shared_state
      methods = self.methods.grep(/^test_/)
      methods.all? { |method| send(method) }
    end

    def initialize_shared_state
      @shared_state = Simtellus::State.initialize_state(Date.new(2088, 1, 1), 100)
    end

    def test_initialize_state
      assert(@shared_state.current_date == Date.new(2088, 1, 1))
      assert(@shared_state.get_state(0, 0)[:temperature] == 15.0)
    end

    def test_set_state
      @shared_state.set_state(0, 0, { temperature: 20.0 })
      assert(@shared_state.get_state(0, 0)[:temperature] == 20.0)
    end

    def test_add_artifact
      @shared_state.add_artifact(0, 0, { name: 'Artifact1' })
      assert(@shared_state.get_artifacts(0, 0).include?({ name: 'Artifact1' }))
    end

    def test_advance_date
      @shared_state.advance_date
      assert(@shared_state.current_date == Date.new(2088, 1, 2))
    end

    def test_compute_temperature
      date = Date.new(2088, 1, 1)
      lat = 0
      lon = 0
      cumulative_temp = 15.0
      temperature = Simtellus::Computation.compute_temperature(date, lat, lon, cumulative_temp)
      assert(temperature.class == Float)
      assert(temperature >= -50 && temperature <= 50)
    end

    def test_update_simulation
      Simtellus::Computation.update_simulation(Date.new(2088, 1, 1))
      assert(@shared_state.current_date == Date.new(2088, 1, 2))
    end

    private

    def assert(condition)
      raise "Test failed" unless condition
    end
  end
end

# Run the tests
Simtellus::Tests.new.run_tests
