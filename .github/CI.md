# Continuous Integration (CI)

This document explains the Continuous Integration (CI) workflow for the Mutonex project. The CI pipeline is designed to automatically test the codebase to ensure its integrity and prevent regressions.

The CI workflow is defined in the `.github/workflows/ci.yml` file and consists of two main jobs:

1.  `elixir-tests`
2.  `docker-compose-tests`

## `elixir-tests` Job

This job is responsible for running the test suite for the Elixir-based `gameserver`.

### What it does:

1.  **Sets up Elixir:** It uses the `erlef/setup-elixir` action to install the specified versions of Elixir and OTP (Erlang). This ensures a consistent and reproducible environment for running the tests.
2.  **Installs Dependencies:** It runs `mix deps.get` to fetch all the necessary Elixir dependencies defined in the `mix.exs` file.
3.  **Runs Tests:** It executes `mix test` to run the complete test suite for the `gameserver`. `mix test` is the standard way to run tests in an Elixir project and ensures all tests are discovered and executed.

### Why it's important:

This job guarantees that the core logic of the `gameserver` is functioning as expected. Running these unit and integration tests automatically on every push and pull request helps catch bugs early and maintain code quality.

### How to run locally:

To run the Elixir tests on your local machine, navigate to the `src/gameserver` directory and run the following commands:

```bash
mix deps.get
mix test
```

## `docker-compose-tests` Job

This job performs a higher-level integration test to ensure that all the different services (`webserver`, `gameserver`, `planet_sim`, and `postgres`) can be built and started together successfully.

### What it does:

1.  **Builds and Starts Services:** It uses `docker-compose -f src/compose.yaml up -d` to build the Docker images for all services and start them in the background.
2.  **Waits for Services to be Healthy:** Instead of a fixed delay, this job now uses a script to poll the `/health` endpoints of the `webserver` (at `http://localhost:8888/health`) and the `gameserver` (at `http://localhost:4000/health`). It waits until both services return a `200 OK` status, with a timeout of 60 seconds.
3.  **Checks Services:** After the services are healthy, it runs `docker-compose ps` to list the running containers and their statuses, providing a clear snapshot of the environment. It then explicitly curls the health endpoints again to confirm they are responsive.

### Why it's important:

This job verifies that the services are not only buildable but can also run together and communicate as expected. It's a crucial smoke test that catches configuration issues, networking problems, or dependency conflicts between services that might not be apparent from unit tests alone.

### How to run locally:

To run the Docker Compose integration tests on your local machine, navigate to the `src/` directory and run:

```bash
docker-compose -f compose.yaml up -d --build
```

You can then manually check the health of the services by running:

```bash
curl http://localhost:8888/health
curl http://localhost:4000/health
```
