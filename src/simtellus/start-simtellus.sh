#!/bin/sh

# Install necessary gems
apk add --no-cache build-base
gem install sinatra json dotenv rack

# Run the simulation server
ruby /app/server.rb
