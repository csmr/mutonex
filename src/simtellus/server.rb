require 'sinatra'
require 'json'
require_relative 'simulation'
require_relative 'logger'
require_relative 'config'

module Server
  class App < Sinatra::Base
    # Set the bind option to listen on all network interfaces
    set :bind, '0.0.0.0'

    # validate API key
    # - can be disabled in simtellus/.env
    before do
      return if ENV['API_KEY_AUTH_ENABLE'] != 'true'

      api_key = request.env['HTTP_X_API_KEY'] || params['api_key']
      halt 401, 'Unauthorized' unless api_key == ENV['API_KEY']
    end

    get '/planet_state' do
      lat = params[:lat].to_f
      lon = params[:lon].to_f
      date = Simtellus::State.current_date

      log! "Request for planet state at (#{lat}, #{lon}) for date: #{date}"

      state = Simtellus::State.get_state(lat, lon)
      if state.nil?
        state = Simtellus::Computation.compute_state(date, lat, lon)
        Simtellus::State.set_state(lat, lon, state)
      end

      state.to_json
    end

    post '/store_artifact' do
      artifact = JSON.parse(request.body.read)
      lat = artifact['lat'].to_f
      lon = artifact['lon'].to_f
      Simtellus::State.add_artifact(lat, lon, artifact)
      log! "Artifact stored at (#{lat}, #{lon}): #{artifact}"
      { status: 'success' }.to_json
    end

    get '/simulation_update' do
      date = Simtellus::State.current_date
      Simtellus::Computation.update_simulation(date)
      log! "Simulation updated for date: #{date}"
      { status: 'updated', current_date: date.to_s }.to_json
    end
  end
end

# Start the simulation with the default start date and 100 years of cumulative state
Simtellus.start_simulation

# Define a signal handler for SIGTERM
trap 'TERM' do
  log! 'SIGTERM...'
  puts 'SIGTERM...'
  exit
end

# Run the Sinatra app
Server::App.run! if __FILE__ == $PROGRAM_NAME
