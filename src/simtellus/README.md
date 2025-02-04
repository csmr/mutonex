# Simtellus Planet Simulation Server

Simtellus simulates natural phenomena and environmental conditions of an Earth-like
exoplanet. It provides endpoints for retrieving planet state, storing in-game artifacts,
and updating the simulation.


## Server module

Simtellus source dir is mounted on a ruby-alpine container and it autoruns the
`start-simtellus.sh` script. Once running, it has the following http endpoints:

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

## Troubleshooting

### Controlling the Ruby Server Container

  ```
  docker-compose logs planet_sim       # View logs
  docker-compose exec planet_sim sh    # Access the container
  docker-compose restart planet_sim    # Restart the container
  docker-compose stop planet_sim       # Stop the container
  docker-compose down                  # Remove the container
  ```

### Tests for Simtellus modules
Run tests whenever you change the modules, to catch any regressions by verifying that the simulation and server modules work as expected. The tests cover key functionalities: state initialization, weather computation, artifact storage, and endpoint responses.

To run the tests, navigate to the `repository/src/simtellus` directory and execute the following commands:
```
ruby simulation_tests.rb
ruby server_tests.rb
```

### Common Issues

- **Gem Installation Errors**: Ensure that the `start-simtellus.sh` script has the necessary permissions and that the `Gemfile` and `Gemfile.lock` are correctly configured.
- **Port Conflicts**: Ensure that port 4567 is not being used by another service.


## Module structure

Simtellus is composed of 3 main modules:

- **Planet Module**: module provides the necessary math to approximate natural phenomena, such as solar insolation and weather functions. 
- **Simulation Module**: is the core of the exoplanet simulation logic, handling the computation of the planet's state for each temporal cycle. In effect, using methods in Planet to update State.
- **Server Module**: Provides the HTTP endpoints for interacting with the simulation. Uses the `Simulation` module to get and update the planet's state.

## Example docker session:
```
# start sim
$ docker-compose up -d planet_sim
# see if up
$ docker-compose ps
# container instance logs
$ docker-compose logs planet_sim
# see the app logs
$ docker exec -it src_planet_sim_1 /bin/sh
/ # tail -f app/log/simtellus.log
/ # exit
# after updating sim files
$ docker-compose restart planet_sim
# test endpoint
$ curl http://127.0.0.1:4567/planet_state
$ $ docker-compose stop planet_sim
```
