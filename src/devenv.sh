#!/bin/bash


if ! command -v docker-compose &> /dev/null; then
  echo "sudo apt install docker-compose"
  exit 2
fi

source ./buildscript.sh
docker-compose up
