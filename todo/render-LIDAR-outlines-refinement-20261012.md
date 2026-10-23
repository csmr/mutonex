# LIDAR View Outlines Refinement Itinerary

## Goal

Refine LIDAR outline rendering to eliminate internal edge
bleed using world-space linear depth gap detection, max-gap
pair masking, and early fragment discard.

## Refinement Targets

### 1. Linear Depth World-Space Gap Detection
- In linear depth rendering, `a` and `b` represent `vViewZ / far`.
- World-space distance gap in meters:
  `gapMeters = abs(a - b) * far`.
- Replace `depthThreshold` in `LidarStyles.ts` with human-readable
  `gapMeters` (default `0.5` meters).
- Gaps against sky automatically pass since sky depth is 1.0.
- Small internal separations (< 0.5 m) are suppressed.

### 2. Max-Gap Pair Masking & Early Discard
- Take max of sample pair gaps instead of summing them,
  preventing sub-threshold edge accumulation (bleed slivers).
- Perform early `discard` for non-edge fragments to save GPU
  fill rate and blending overhead.

### 3. Data-Driven Style Configuration
- Configure `gapMeters: 0.5` in `LidarStyles.ts` per style config.
- Pass `gapMeters` uniform to `OutlineFragmentShader`.

### 4. Outer Silhouette Isolation (Inverted Hull / Backface)
- Complement screen-space outlines for Unifont 3D voxel models
  using Backface Extrusion / Inverted Hull technique.
