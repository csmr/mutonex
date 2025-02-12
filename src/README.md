# Mutonex development notes

This project depends on bash, git and docker-compose. 

The basic idea is that devs can run a container where game instance is isolated.

To start, clone repo, `cd mutonex/src`, and execute `./devenv.sh`, follow output.

## Dev-env notes

### devenv.sh 
Dev-env startup script `devenv.sh` tests dependencies, sets up app env & database credentials, and executes `docker-compose` to create services in `compose.yaml`, find port numbers there.

Unless `devenv.sh` runs `scripts/init-database-env.sh`, no credentials in `data/.env.postgres`, and `docker-compose` will fail.

### Client pack
See `scripts/bundle-webclient.sh` for the client esbuild bundle code.

### Server pack
See `webserver/start-webserver.sh`, it makes API key, contributors list, client bundle and runs server.

For planet sim, see `simtellus/start-simtellus.sh`, this installs ruby deps and start simtellus server.

### Production env
This is achieved via 'production' profile services in `compose.yaml`. Install certs (or certbot), and then you can start the production containers with:
``$ docker-compose --profile production up``
