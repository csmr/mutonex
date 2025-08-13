require_relative 'simulation'
require_relative 'logger'

module Simtellus
  module Tests
    # This helper is run before each test that needs a clean state.
    def reinitialize_state
      # Using only a 1-year warm-up to keep tests fast.
      Simtellus::State.initialize_state(Date.new(2088, 1, 1), 1)
    end

    def test_initialize_state
      reinitialize_state
      # With the fix to update_simulation, the date should not advance during init.
      assert(State.current_date == Date.new(2088, 1, 1))
      # After the warm-up, the temperature should be a plausible value, not the default.
      temp = State.get_state(0, 0)[:temperature]
      assert(temp.is_a?(Float) && temp.between?(-90, 60) && temp != 15.0)
    end

    def test_set_state
      reinitialize_state
      State.set_state(0, 0, { temperature: 20.0 })
      assert(State.get_state(0, 0)[:temperature] == 20.0)
    end

    def test_add_artifact
      reinitialize_state
      State.add_artifact(0, 0, { name: 'Artifact1' })
      assert(State.get_artifacts(0, 0).include?({ name: 'Artifact1' }))
    end

    def test_advance_date
      reinitialize_state
      date_before = State.current_date
      State.advance_date
      assert(State.current_date == date_before + 1)
    end

    def test_update_simulation
      reinitialize_state
      date_before = State.current_date
      # The date passed to update_simulation should be the current date for a sequential simulation.
      Simtellus::Computation.update_simulation(date_before)
      # update_simulation should NOT advance the date itself.
      assert(State.current_date == date_before)
    end

    private

    def assert(condition)
      # A simple, custom assertion method.
      raise "Test failed" unless condition
      true # Return true on success
    end

    # --- Test Runner ---
    # This method executes all test_* methods in this module.
    public
    def run_tests
      puts 'Testrun for ' + self.name
      test_methods = self.methods.grep(/^test_/)
      results = test_methods.map do |m|
        # Note: We do not use a shared state here. Each test is responsible
        # for setting up its own state if needed by calling `reinitialize_state`.
        result = send(m)
        puts ">> #{m} pass: #{result}"
        result
      rescue StandardError => e
        puts ">> #{m} ERROR: #{e.message}"
        false
      end

      all_passed = results.all? { |res| res }
      puts(all_passed ? 'Super! All tests pass.' : 'FAIL!!! Test(s) not passing.')
    end
  end
  extend Tests
  run_tests if $PROGRAM_NAME == __FILE__
end
