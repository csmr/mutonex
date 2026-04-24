# Webclient Rendering Architecture

## Overview
Webclient uses **Three.js** via CDN. Rendering logic decoupled from game loop using **Strategy Pattern** via `ViewManager`.

## Core Components

### 1. ViewManager
- Orchestrates render loop.
- Delegates to active `IView`.
- **Interface (`IView`)**:
  - `updateEntities(entities)`: Syncs game state.
  - `updateTerrain(terrain)`: Generates ground geometry.
  - `preRender(renderer)`: Optional hook for multi-pass effects.

### 2. LidarView (GPU-Based Scanning)
Implements "High-Tech / Low-Fi" visual style.
- **Pipeline**:
  1. **Virtual Scene**: Hidden scene with pre-baked 3D Text Geometry (emoji glyphs) and ground plane.
  2. **Linear Depth Pass**: `preRender` renders Virtual Scene to **FloatType color target**. Writes `z_view / cameraFar` to R channel to avoid WebGL2 vertex-shader sampling limits and `UnsignedByteType` quantization loss.
  3. **Point Cloud**: Main scene renders `THREE.Points` grid (480×270 samples).
  4. **Shader Reconstruction**: Vertex shader samples float texture to displace points from screen UVs to world-space.
- **Optimization**:
  - **Geometry Caching**: Reuses BufferGeometry JSONs via `Map<hex, BufferGeometry>`.
  - **Scan Modes**: Vertical and Horizontal modes use 480×270 grids; visual differences are shader-driven.

### 3. SphereView
Legacy standard 3D rendering.
- **Entities**: Instantiates `SphereGeometry` meshes.
- **Terrain**: `PlaneGeometry` with vertex displacement from heightmap.

### 4. GlobeView
Planetary overview.
- **GeoJSON**: Renders country outlines via `Line`.
- **Projection**: Places sectors and units on globe surface via lon/lat conversion.

## Data Flow
1. **Server**: WebSocket sends `[id, x, y, z]` JSON.
2. **Main Loop**: Interpolates fauna; aggregates `EntityData[]`; calls `activeView.updateEntities()`.
3. **Input**: `Tab` toggles View; `L` toggles Lidar mode; `[`/`]` adjust entropy.

## Environment
- **Globals**: `THREE` accessed via `window` (declared in `global_types.ts`).
- **Build**: `esbuild` bundles TypeScript.
