# Webclient Rendering Architecture

## Overview
The webclient uses **Three.js** via CDN globals, managed by a **Deno/TypeScript** application. Rendering logic is decoupled from the game loop using the **Strategy Pattern** via `ViewManager`.

## Core Components

### 1. ViewManager
*   **Role**: Manages the active render loop and delegates logic to the current `IView`.
*   **Interface (`IView`)**:
    *   `updateEntities(entities)`: Syncs game state.
    *   `updateTerrain(terrain)`: Generates ground geometry.
    *   `preRender(renderer)`: Optional hook for multi-pass effects (e.g., FBOs).

### 2. LidarView (GPU-Based Scanning)
Implements the "High-Tech / Low-Fi" visual style.
*   **Pipeline**:
    1.  **Virtual Scene**: Hidden scene containing **3D Text Geometry** (emojis via `FontLoader`) and a wireframe ground.
    2.  **Depth Capture**: `preRender` renders the Virtual Scene to a **Depth Texture** (`WebGLRenderTarget`).
    3.  **Point Cloud**: The main scene renders a `THREE.Points` grid.
    4.  **Shader Reconstruction**: The Vertex Shader samples the Depth Texture to displace points from screen-space UVs back to World-Space positions.
*   **Optimization**:
    *   **Geometry Caching**: `Map<char, TextGeometry>` reuses heavy font geometries.
    *   **Resolution**: Toggles between 120x240 (Vertical) and 240x240 (Horizontal) grids.

### 3. SphereView (Legacy)
Standard object-based rendering.
*   **Entities**: Instantiates `THREE.SphereGeometry` meshes.
*   **Terrain**: `THREE.PlaneGeometry` with vertex displacement from heightmap data.

## Data Flow
1.  **Server**: Sends `[id, x, y, z]` tuples via WebSocket.
2.  **Main Loop**:
    *   Interpolates Fauna positions (client-side wandering).
    *   Aggregates entities into `EntityData[]`.
    *   Calls `activeView.updateEntities()`.
3.  **Input**:
    *   `Tab`: Toggles Active View.
    *   `L`: Toggles Lidar Scan Mode.

## Environment Constraints
*   **Globals**: `THREE` and `OrbitControls` are accessed via `window` (declared in `global_types.ts`) to avoid complex bundler configuration for CDN scripts.
*   **Build**: `esbuild` bundles the TypeScript; `mutonex.html` provides the runtime dependencies.
