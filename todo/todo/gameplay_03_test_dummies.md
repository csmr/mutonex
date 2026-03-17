# TODO 03: Test Dummies & Mock Network Entities

**Context:**
In order to test and fine-tune "Charming" dynamics and video-meet interactions locally, there must be target units available inside the game world.

**Requirements:**
- **Dummy Player:** Implement a function within `GameSession.ex` (server side) that spawns a "ghost" or dummy online player connection (an immobile `:head` unit disconnected from a WebSocket socket, but still ticking in State) that the real player can locate and interact with.
- **Charmable Fauna:** Adjust `FaunaSystem` to spawn at least one specific test mob with the `is_charmable: true` attribute and a static positive `charm` score directly next to the player's spawn location, so that the player has immediate access to an interactive entity for testing.
