# Simtellus Planet Simulation Server

Simtellus simulates natural phenomena and environmental conditions of an Earth-like
exoplanet. It provides endpoints for retrieving planet state, storing in-game artifacts,
and updating the simulation.


## Server module
Note  `./src/simtellus/.env.template` as basis for configuration `.env`-file, simtellus container cannot start otherwise.

In `./src/compose.yaml` ['planet_sim' service](https://github.com/csmr/mutonex/blob/8890cac548510e191cb936f68c0b591c8ebc0a91/src/compose.yaml#L24), repo dir `./src/simtellus` is mounted to `/app` of ruby-alpine container. Service runs [`start-simtellus.sh`](https://github.com/csmr/mutonex/blob/master/src/simtellus/start-simtellus.sh).

### Server http endpoints:

#### `GET /planet_state
Retrieves the current state of the planet for a given latitude and longitude.

#### `POST /store_artifact`
Stores an in-game artifact at a given latitude and longitude.

#### `GET /simulation_update`
Updates the simulation state and advances the date.

### Example Requests
- Retrieve planet state:
    ```sh
    curl "http://localhost:4567/planet_state?lat=30&lon=40"
    ```
- Store artifact:
    ```sh
    curl -X POST "http://localhost:4567/store_artifact" -H "Content-Type: application/json" -d '{"lat": 30, "lon": 40, "name": "Artifact1"}'
    ```
- Update simulation:
    ```sh
    curl "http://localhost:4567/simulation_update"
    ```

### Server API key authentication
If `API_KEY_AUTH_ENABLED=true` in `./src/simtellus/.env`, the server http endpoint will look for api key parameter in requests, gives 401 if key not present. API keys are generated on every `./src/start-webserver.sh` run, (`scripts/generate-api-key.js`).


## Controlling the Ruby Server Container

  ```
  docker-compose up -d planet_sim      # Sim only
  docker-compose ps                    # List containers
  docker-compose logs planet_sim       # Container logs
  docker-compose exec planet_sim sh    # Access the container
  / # tail -f app/log/simtellus.log    # Server logs
  docker-compose restart planet_sim    # Restart the container
  docker-compose stop planet_sim       # Stop the container
  docker-compose down                  # Remove the container
  ```

## Tests for Simtellus modules
Run tests whenever you change the modules, to catch any regressions by verifying that the simulation and server modules work as expected. The tests cover key functionalities: state initialization, weather computation, artifact storage, and endpoint responses.

To run the tests, navigate to the `repository/src/simtellus` directory and execute the following commands:
```
ruby simulation_tests.rb
ruby server_tests.rb
```

## Module structure

Simtellus is composed of 3 main modules:

- **Planet Module**: module provides the necessary math to approximate natural phenomena, such as solar insolation and weather functions. 
- **Simulation Module**: is the core of the exoplanet simulation logic, handling the computation of the planet's state for each temporal cycle. In effect, using methods in Planet to update State.
- **Server Module**: Provides the HTTP endpoints for interacting with the simulation. Uses the `Simulation` module to get and update the planet's state.

