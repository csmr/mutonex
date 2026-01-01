# Mutonex development notes

This project depends on bash, git and docker-compose. 

The basic idea is that devs can run containers where game instances run in isolation.

To start, clone repo, `cd mutonex/src`, and execute `./devenv.sh`, follow output.


## devenv.sh
Dev-env startup script `src/devenv.sh`
  1. tests dependencies
  2. sets up app env & database credentials once
  3. executes `docker-compose up` to run services in `src/compose.yaml`, find port numbers there.

Unless `devenv.sh` runs, no credentials in `src/.env` and `data/.env.postgres`, so `docker-compose` will fail.


## .env file
This `src/.env` file is created once, using `src/data/.env.postgres`. If deleted, access to database is lost.

To generate the `.env` file, `dev-env.sh` startup runs `src/scripts/init-database-env.sh` and `src/scripts/init-dotenv.sh`.


## Client pack
See `src/scripts/bundle-webclient.sh` for the client esbuild bundle code.


## Servers
See `src/gameserver` for the game session server, which also serves the webclient static assets.

See `src/scripts/build_and_watch_webclient.sh`, it creates an API key, contributors list, client bundle. The `webclient_builder` service in `compose.yaml` runs this script.

For planet sim, see `src/simtellus/start-simtellus.sh`, this installs ruby deps and starts the simtellus server.


## Database
DB initialized with `src/compose.yaml` config, where `volumes:` sets data-dir and `env_file:` default credentials.

DB access for servers depends on the credentials in `src/.env`.


## .agents
For LLM/agent automata, see the `.agents` dir, where `AGENTS.md` guide and `agent_setup.sh` setup script can be found.


## Production env
This is achieved via 'production' profile services in `compose.yaml`. Install certs (or certbot), and then you can start the production containers with:
``$ docker-compose --profile production up``
