#!/bin/bash
# Test Mutonex HTTP endpoints. Usage: ./scripts/test_endpoints.sh [PORT]

PORT="${1:-4000}"
HOST="http://localhost:${PORT}"

req() {
  echo -e "--> GET $1\n$(curl ${2:--s} "${HOST}$1" | head -n 5)\n"
}

echo "Testing Mutonex HTTP Endpoints on ${HOST}..."
req "/health"
req "/" "-s -I"
req "/weather-history?sector=sector_10_20"
req "/db-test"
