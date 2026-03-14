# TODO 07: Gameplay Mechanics via LIDAR Audio Pings

**Context:**
The core gameplay relies heavily on LIDAR visual representation, which can be disorienting for new players trying to locate charmable follower units in the environment. We can explore using directional audio as a supplementary mechanic to both guide the player and reinforce the tactile feeling of operating an electro-mechanical sensor.

## Requirements:
- **FPV Horizontal LIDAR Pings:** When a unit (like a charmable NPC) is intercepted by the FPV LIDAR's horizontal sweeping beam, the client should emit a distinct, diegetic audio "ping."
- **Stereo Field Spatialization:** Use the Web Audio API to spatialize the ping in the stereo field based on the unit's relative angle to the player's facing direction. This provides acoustic echolocation to help "noobs" discover followers.
- **Visual Sweep Synergy:** To make the audio ping make sense intuitively, the visual "LIDAR sweep" feature (a scanning line or localized burst of points) should ideally be reinstated or synchronized with the audio trigger.

## Considerations for Vertical Birds-Eye LIDAR:
- The strategic Powerstructure view currently uses a bird's-eye downward scan.
- Does a sweeping line/plane make sense here visually and acoustically? If a full 360-degree radial sweep occurs, it might result in too many simultaneous pings if the base is crowded.
- *Open Question:* Should the birds-eye LIDAR ping at all, or should it remain a purely visual strategic map? If implemented, consider a different, perhaps deeper or more muffled ping sound to distinguish the sensor suite.
