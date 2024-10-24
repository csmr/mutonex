# Mutonex development notes

The basic idea is that devs can run a container where game instance is isolated.

## Dev env
To start, execute `./devenv.sh`, follow output. It attemps to install dependencies and compose a container from `docker-compose.yml`, find port numbers there.

## Client pack
See `deno.json` on the esbuild client code bundle.

## Server pack
Not implemented yet.

## Production env
This is achieved via 'production' profile services in docker-compose.yml. Install certs (or certbot), and then you can start the production containers with:
``$ docker-compose --profile production up``
