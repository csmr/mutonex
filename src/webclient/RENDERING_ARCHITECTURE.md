# Webclient Rendering Architecture

## Overview
The webclient uses **Three.js** via CDN globals,
managed by a **Deno/TypeScript** application.
Rendering logic is decoupled from the game loop
using the **Strategy Pattern** via `ViewManager`.

## Core Components

### 1. ViewManager
*   **Role**: Manages the active render loop and
    delegates logic to the current `IView`.
*   **Interface (`IView`)**:
    *   `updateEntities(entities)`: Syncs game state.
    *   `updateTerrain(terrain)`: Generates ground
        geometry.
    *   `preRender(renderer)`: Optional hook for
        multi-pass effects (e.g., FBOs).

### 2. LidarView (GPU-Based Scanning)
Implements the "High-Tech / Low-Fi" visual style.
*   **Pipeline**:
    1.  **Virtual Scene**: Hidden scene containing
        **pre-baked 3D Text Geometry**
        (emoji glyphs loaded via
        `BufferGeometryLoader` from JSON)
        and a ground plane.
    2.  **Linear Depth Pass**: `preRender` renders
        the Virtual Scene to a **FloatType colour
        render target** using a custom
        `ShaderMaterial` that writes
        `z_view / cameraFar` into the R channel.
        This avoids the WebGL2 limitation that
        prevents vertex-shader sampling of
        `DepthTexture`, and the quantization loss
        of `UnsignedByteType` at the 0.1/1000
        near/far ratio.
    3.  **Point Cloud**: The main scene renders a
        `THREE.Points` grid (480×270 samples,
        same density for both scan modes).
    4.  **Shader Reconstruction**: The Vertex
        Shader samples the FloatType colour
        texture to displace points from
        screen-space UVs back to world-space
        positions.
*   **Optimization**:
    *   **Geometry Caching**:
        `Map<hex, BufferGeometry>` reuses
        pre-generated geometry JSONs.
    *   **Scan Modes**: Vertical (dense points)
        and Horizontal (fragment-shader scanline
        bands) both use 480×270 sample grids;
        the visual difference is shader-only.

### 3. SphereView (Standard 3D)
Standard object-based rendering.
*   **Entities**: Instantiates
    `THREE.SphereGeometry` meshes.
*   **Terrain**: `THREE.PlaneGeometry` with
    vertex displacement from heightmap data.

### 4. GlobeView (Planet Overview)
Globe-based rendering for planetary overview.
*   **GeoJSON**: Renders country outlines
    on a sphere using `THREE.Line`.
*   **Sectors/Units**: Placed on the globe
    surface via lon/lat conversion.

## Data Flow
1.  **Server**: Sends `[id, x, y, z]` tuples
    via WebSocket (Phoenix channels).
2.  **Main Loop**:
    *   Interpolates Fauna positions
        (client-side wandering).
    *   Aggregates entities into `EntityData[]`.
    *   Calls `activeView.updateEntities()`.
3.  **Input**:
    *   `Tab`: Toggles Active View.
    *   `L`: Toggles Lidar Scan Mode.
    *   `[` / `]`: Adjusts Lidar entropy.

## Environment Constraints
*   **Globals**: `THREE` and `OrbitControls`
    are accessed via `window` (declared in
    `global_types.ts`) to avoid complex bundler
    configuration for CDN scripts.
*   **Build**: `esbuild` bundles the TypeScript;
    `mutonex.html` provides runtime dependencies.
