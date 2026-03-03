# BUG: Camera Controls Buggy (WASD axis mapping)

**Date**: 2026-03-03

**Description**:
The in-game controls are buggy and the camera direction does not follow the WASD keys as expected. 

**Expected Behavior**:
The logic should have `W` moving forward in the direction of the camera, `A` backwards, and `S` and `D` to Left and Right, respectively. Currently, the movement behaves differently or is misaligned with the camera's look vector. 

**Notes**:
Likely need to adjust the event listener for keydown and utilize the camera's forward and right vectors (e.g., `camera.getWorldDirection()`) to translate the position.
