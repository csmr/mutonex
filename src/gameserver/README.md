# Mutonex Gameserver

Elixir/Phoenix server for game sessions and simulation.

## Developer Access

- **3D View**: `http://localhost:4000/`
  (Auto-joins default sector)
- **Lobby**: `http://localhost:4000/?join=false`
- **Diagnostics**: `http://localhost:4000/api/db-test`

## Project Structure

- `lib/engine`: Core game logic and systems.
- `lib/net`: Phoenix channels and controllers.
- `lib/simtellus`: Planet simulation logic.
- `lib/utils`: Shared utilities.

## Testing

Run tests with `mix test`.
