# TODO 02: Feature Card UI & HUD

**Context:**
The Webclient currently relies purely on a 3D interface with crosshairs (FPS) or a generic birds-eye perspective (RTS) but possesses no HUD overlay for displaying a player's inventory, unlocked abilities, or properties. The "Charm" ability should be presented to the player as an actionable skill, potentially visually represented as a "Feature Card" or badge per the Design Document.

**Requirements:**
- Implement a 2D HTML/CSS overlay inside the Webclient, rendered on top of the 3D WebGL canvas.
- Display Feature Cards in the "bottom row" of the viewport. They should be 48px tall squares with the name as the title and a fancy gradient border.
- Cards must be legible and bold, but carefully sized so they don't take up too much vertical screen space (maintaining accessibility).
- Bind the HUD's visual state to the player's updated `Unit` properties parsed from the server's state broadcasts.
- Display the player's current `charm` level visibly.
