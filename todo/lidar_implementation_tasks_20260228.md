# LIDAR Rendering Implementation Tasks
**Date:** 2026-02-28

## Current State Summary
The default "Horizontal" scan mode (`currentMode = 'horizontal'`) has been successfully migrated to use hardware Point Sprites (`gl_PointCoord`). This provides dynamically sized, smooth, anti-aliased circular dots whose radius scales linearly with the physical depth (`vDist`) of the sampled surface, avoiding screen-space pixelation artifacts. 

However, several architectural shortcomings and unfulfilled requirements remain, particularly regarding the "Vertical" high-resolution mode and the interplay of resolution buffers.

## Identified Tasks

### 1. Vertical Mode: Missing Connected Scanlines
- **Defect:** The vertical mode (`currentMode = 'vertical'`) currently renders as a dense cloud of isolated 2px square point sprites. It does not draw continuous, connected vertical lines between the sampled data points as conceptually intended.
- **Requirement/Solution Path:** `THREE.Points` intrinsically cannot connect varying vertices. Achieving true hardware-accelerated continuous lines requires either:
  1. Transitioning the representation geometry from `GL_POINTS` to `GL_LINES` or `GL_LINE_STRIP` with an index buffer tailored to draw vertical connect-the-dots segments.
  2. Employing a shader trick where vertical point sprites are artificially stretched along the Y-axis to visually bridge the physical screen-space gap between adjacent sample rows.

### 1b. Orange Lidar Rendering Style (Completed)
- **Status:** Implemented.
- **Description:** Shifted the default LIDAR rendering palette from green to an orange map ranging from 1700K (deep orange background) to 3800K (warm white foreground). This matches the original design document specification.

### 2. Static Resolution for Both Modes
- **Defect:** The sample resolution (`samplesH` and `samplesV`) is currently hardcoded and shared across both modes (recently modified to 400x280). The vertical mode is intended to be a high-resolution, dense topological sweep and should inherently operate at double the resolution of the horizontal mode.
- **Requirement/Solution Path:** `setScanMode` must be refactored to dynamically adjust `samplesH` and `samplesV` depending on the requested mode (e.g., 400x280 for horizontal, 800x560 for vertical). 

### 3. Cost of Dynamic Geometry Rebuilding
- **Defect:** Currently, the WebGL render targets and vertex buffers are built once optimally. If `samplesH` and `samplesV` become dynamic based on the active mode (Requirement #2), the Lidar pipeline cannot simply toggle a uniform.
- **Requirement/Solution Path:** Implement an efficient cleanup and regeneration lifecycle inside `setScanMode()` to reconstruct the `WebGLRenderTarget` (for depth passes), the depth read-back buffer, and the entire `THREE.BufferGeometry` arrays (positions and UVs) holding the point cloud without stalling the main thread during gameplay. 

### 4. Legacy "Pixel Block" Mode Inconsistency 
- **Defect:** By migrating to Vertex Shader dynamic sizing (`gl_PointSize`), the legacy "square block" mode (`dotType = 0`) now draws squares that scale based on distance, rather than the original constant 1x1/2x2 hardware pixels. 
- **Requirement/Solution Path:** If the strict legacy aesthetic needs identical preservation, the vertex shader sizing needs to conditionally branch on `dotType`, reverting to a fixed 1.0 or 2.0 `gl_PointSize` when circles are disabled.

### 5. Point Sprite Z-Depth Sorting (Alpha blending)
- **Defect:** The smooth circular dots rely on an alpha multiplier and `discard` instead of true transparent depth blending because point sprites in `THREE.Points` are rendered in a fixed buffer memory order, not physically sorted back-to-front. If we ever want true translucent overlapping rings rather than binary cutouts, they will suffer from draw-order depth occlusion artifacts at the edges.
- **Requirement/Solution Path:** Rely on `discard` for gameplay frame performance. If soft translucency is required for close inspection, explore GPU radial sorting or simpler additive blending `THREE.AdditiveBlending` to bypass Z-sorting depth issues, though it could blow out brightness when dots overlap.
