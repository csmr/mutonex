# [IMPLEMENTED] TODO 04: Charm Action Implementation

**Context:**
Once the player unit has a `charm` attribute (TODO 01), the UI can display it (TODO 02), and there are targets to charm (TODO 03), the actual gameplay logic of clicking the "Charm" card to trigger the network command must be built.

**Requirements:**
- **Client Side:** Implement input handling so that when the player targets a valid unit with their crosshair (raycasting from `AvatarController`) and clicks the "Charm" Feature Card (or hotkey), a structured message `{"action": "charm", "target_id": "..."}` is sent to the GameServer over the WebSocket.
- **Server Side:** Implement a `handle_cast` mechanism for `:action_charm` within `GameSession.ex` or a dedicated action handler module. 
- Implement temporary mock constraints for the charm event (e.g. random percent chance). If successful, change the target unit's `society_id` to match the player's, essentially "turning" the follower.
