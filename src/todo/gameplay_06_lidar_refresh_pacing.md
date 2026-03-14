# TODO 06: Gameplay pacing via LIDAR Refresh Rates

**Context:**
The core game design document explicitly characterizes Mutonex as a "casual" game. We want to avoid descent into an "RTS Starcraft-style clickfest." The narrative reliance on LIDAR provides an excellent diegetic mechanism for pacing the game and artificially limiting the player's actionable information rate.

## Requirements:
- **Variable Refresh Rates:** The in-game LIDAR rendering should not be tied to the maximum client FPS (e.g., 60fps). Instead, its state should update in slower, sweeping bursts.
- **FPV Horizontal LIDAR (Unit View):** Explore pacing this view to refresh roughly 3 times per "turn" (or designated time interval). This forces the player to interpret snapshots of their immediate surroundings rather than reacting to fluid motion.
- **Bird's Eye Vertical LIDAR (Powerstructure View):** Explore pacing this strategic view to refresh roughly 4 times per turn. This gives slightly more tactical cadence to base management but keeps the information flow deliberately stunted.

**Exploration Goal:** Implement a throttle handler within the client's `LidarView` or `EntityRenderer` rendering loop to simulate mechanical laser rotation/scanning latency, rather than a continuous full-screen datastream.
