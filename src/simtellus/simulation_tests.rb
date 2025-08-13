require_relative 'simulation'
require_relative 'logger'

module Simtellus
  module Tests
    # Run tests with '$ ruby simulation_tests.rb'.
    # run_tests method executes all test_* methods.

    def run_tests
      puts 'Testrun for ' + self.name
      initialize_shared_state
      test_methods = self.methods.grep(/^test_/)
      results = test_methods.map do |m|
        result = send(m)
        puts ">> #{m} pass: #{result}"
        result
      end

      all_passed = results.all? { |res| res }
      puts(all_passed ? 'Super! Tests pass.' : 'Fail!!! Test(s) not passing.')
    end

    def initialize_shared_state
      Simtellus::State.initialize_state(Date.new(2088, 1, 1), 100)
    end

    def test_initialize_state
      # After initialization, which includes running the simulation for a number of years,
      # the date should be the start date, and the temperature should be a plausible value,
      # not the initial default of 15.0.
      assert(State.current_date == Date.new(2088, 1, 1))
      temp = State.get_state(0, 0)[:temperature]
      assert(temp.is_a?(Float) && temp.between?(-90, 60))
    end

    def test_set_state
      State.set_state(0, 0, { temperature: 20.0 })
      assert(State.get_state(0, 0)[:temperature] == 20.0)
    end

    def test_add_artifact
      State.add_artifact(0, 0, { name: 'Artifact1' })
      assert(State.get_artifacts(0, 0).include?({ name: 'Artifact1' }))
    end

    def test_advance_date
      State.advance_date
      assert(State.current_date == Date.new(2088, 1, 2))
    end

    def test_update_simulation
      Simtellus::Computation.update_simulation(Date.new(2088, 1, 1))
      assert(State.current_date == Date.new(2088, 1, 2))
    end

    private

    def assert(condition)
      raise "Test failed" unless condition
    end
  end
  extend Tests
  run_tests if $PROGRAM_NAME == __FILE__
end
