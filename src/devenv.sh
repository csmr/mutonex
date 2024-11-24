#!/bin/bash

if ! command -v docker-compose &> /dev/null; then
  echo "no docker-compose, on debian try:"
  echo "sudo apt install docker-compose"
  echo "sudo usermod -aG docker [username]"
  echo "log out and back in, retry"
  exit 1
fi

git shortlog -n -s > ./dist/CONTRIBS

echo "мμτοηεχ δεv εηv ιηιτ"
docker-compose up
