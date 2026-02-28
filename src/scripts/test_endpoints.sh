# testing if API_KEY_AUTH_ENABLED=false
curl http://127.0.0.1:4567/planet_state
curl http://localhost:8888

# This leads to unauthorized
curl "http://localhost:8888/?api_key_hash=b5fb75f0f915d544d135c08d74455cdb3bc494c278a445492ad53a3495d4fd48"

# This doesn't seem to do anything?
curl -X POST "http://localhost:8888/" -H "Content-Type: application/json" -H '{"api-key-hash": "your_secure_api_key"}' -d '{"api_key": "your_secure_api_key"}'


