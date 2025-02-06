# Mutonex development notes

The basic idea is that devs can run a container where game instance is isolated.

## Dev containers
To start, execute `./devenv.sh`, follow output. It tests dependencies, sets up app env & database credentials, and executes `docker-compose up`, find port numbers there.

Unless `devenv.sh` runs `scripts/init-database-env.sh`, no credentials in `data/.env.postgres`, and `docker-compose` will fail.

## Client pack
See `scripts/bundle-webclient.sh` for the client esbuild bundle code.

## Server pack
See `webserver/start-webserver.sh`, it makes API key, contributors list, client bundle and runs server.
For planet sim, see `simtellus/start-simtellus.sh`, this installs ruby deps and start simtellus server.

## Production env
This is achieved via 'production' profile services in docker-compose.yml. Install certs (or certbot), and then you can start the production containers with:
``$ docker-compose --profile production up``
