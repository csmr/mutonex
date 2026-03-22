# TODO 01: Player Unit Unification & Protocol

**Context:** 
Currently, the Elixir `GameSession` tracks connected clients merely as `Player` structs which only have an `id` and `position`. The design document states players control a "Head" `Unit`, which is a distinct struct defined in `entities.ex` containing attributes like `charm` and `is_charmable`.

**Requirements:**
- Update `GameSession.ex` to initialize new connections as `Unit` structs of type `:head` rather than bare `Player` structs.
- Assign the `charm` attribute (and potentially starting Feature Cards/Inventory) to the player upon spawning.
- Update the broadcast protocol (`broadcast_state_update`) so that it doesn't just send `[id, x, y, z]`, but also broadcasts the unit's attributes to the client.
- Update the Webclient `main.ts` and `AvatarController` to receive and store these new unit state variables.
