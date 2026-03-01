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

### 2. Static Resolution for Both Modes (Completed)
- **Status:** Implemented dynamic config `LidarStyles` replacing hardcoded properties.

### 3. Cost of Dynamic Geometry Rebuilding
- **Defect:** Currently, the WebGL render targets and vertex buffers are built once optimally. If `samplesH` and `samplesV` become dynamic based on the active mode (Requirement #2), the Lidar pipeline cannot simply toggle a uniform.
- **Requirement/Solution Path:** Implement an efficient cleanup and regeneration lifecycle inside `setScanMode()` to reconstruct the `WebGLRenderTarget` (for depth passes), the depth read-back buffer, and the entire `THREE.BufferGeometry` arrays (positions and UVs) holding the point cloud without stalling the main thread during gameplay. 

### 4. Legacy "Pixel Block" Mode Inconsistency (Completed)
- **Status:** Fixed `gl_PointSize` scaling logic in vertex shader.

### 5. Point Sprite Z-Depth Sorting (Alpha blending) (Completed)
- **Status:** Switched to AdditiveBlending and soft threshold discards.
