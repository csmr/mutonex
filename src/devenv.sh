#!/bin/bash

if ! command -v docker-compose &> /dev/null; then
  echo "sudo apt install docker-compose"
  echo "sudo usermod -aG docker [username]"
  echo "log out and back in, retry"
  exit 2
fi

echo "мμτοηεχ δεv εηv ιηιτ"
docker-compose up
