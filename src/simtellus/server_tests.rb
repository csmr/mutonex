require 'rack/test'
require_relative 'server'
require_relative 'simulation'
require_relative 'logger'

module Server
  module Tests
    # Run tests with '$ ruby server_tests.rb'.
    # run_tests method executes all test_* methods.

    include Rack::Test::Methods

    def app
      Server::App
    end

    def run_tests
      initialize_shared_state
      methods = self.methods.grep(/^test_/)
      methods.all? { |method| send(method) }
    end

    def initialize_shared_state
      Simtellus.start_simulation(Date.new(2088, 1, 1), 100)
    end

    def test_planet_state_endpoint
      get '/planet_state?lat=30&lon=40'
      assert_equal(200, last_response.status)
      assert(last_response.body.include?('temperature'))
    end

    def test_store_artifact_endpoint
      post '/store_artifact', { lat: 30, lon: 40, name: 'Artifact1' }.to_json, { 'CONTENT_TYPE' => 'application/json' }
      assert_equal(200, last_response.status)
      assert(last_response.body.include?('success'))
    end

    def test_simulation_update_endpoint
      get '/simulation_update'
      assert_equal(200, last_response.status)
      assert(last_response.body.include?('updated'))
    end

    private

    def assert_equal(expected, actual)
      raise "Expected #{expected}, but got #{actual}" unless expected == actual
    end

    def assert(condition)
      raise "Test failed" unless condition
    end
  end
  extend Server
end

# Run the tests
extend Server::Tests
run_tests
Server::Tests.run_tests
