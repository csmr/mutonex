# BUG: Line View Overexposure and Time-Dependent Shift

**Date**: 2026-03-03

**Description**:
The new line view (Emulated Contours) has a time-dependent rendering style shift. 

**Expected Behavior**:
The rendering style should remain consistent after transitioning to the mode.

**Current Behavior**:
The correct rendering style appears at the very start of transitioning to this mode. Then, after a short time, an overexposed character appears in the render style. The ground plane becomes overexposed and appears white-hot far into the horizon.

**Notes**:
This might be related to a time-based uniform (like `time` or `entropy` which was observed resetting to 0.1 during automated tests) affecting the accumulation or additive blending of the point sprites.
