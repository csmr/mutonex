# Webclient Source Reorganization Plan

## Analysis of Current `src/webclient/` Structure

The current flat structure in `src/webclient/` is becoming crowded. Below is an analysis of each file's responsibility:

| File | Responsibility |
| :--- | :--- |
| `ActionHUD.ts` | UI layer for player actions, inventory, and interactions. |
| `AvatarController.ts` | Logic for avatar movement, camera-relative controls, and interaction triggers. |
| `EntityRenderer.ts` | Management of 3D entity meshes and their lifecycle within a scene. |
| `FirstPersonControls.ts` | Specialized camera control logic for first-person perspective. |
| `GameStateProvider.ts` | WebSocket communication with the Elixir backend and state synchronization. |
| `GlobeView.ts` | Planet-level overview rendering strategy (`IView`). |
| `LidarShaders.ts` | GLSL code for GPU-based Lidar reconstruction and effects. |
| `LidarStyles.ts` | Configuration for Lidar visual presets (colors, scan modes). |
| `LidarView.ts` | The primary Lidar-style rendering strategy (`IView`). |
| `LobbyView.ts` | UI and logic for sector selection and the pre-game lobby. |
| `MockGameStateProvider.ts` | Mock implementation of the game state for offline development/testing. |
| `SphereView.ts` | Legacy/standard 3D mesh rendering strategy (`IView`). |
| `TerrainMesh.ts` | Terrain geometry generation and height sampling logic. |
| `ViewManager.ts` | Orchestrator for switching views and managing the render loop. |
| `global_types.ts` | Type definitions for CDN-loaded globals (Three.js, etc.). |
| `main.ts` | Application entry point and system wiring. |
| `mutonex.html` | Client-side HTML shell. |
| `types.ts` | Shared data structures and interfaces. |

## Proposed Reorganization (COMPLETED)

The following directory structure has been implemented:

```text
src/webclient/
├── core/               # Engine state and management
│   ├── ViewManager.ts
│   ├── GameStateProvider.ts
│   ├── types.ts
│   └── global_types.ts
├── rendering/          # Graphics-specific systems and shaders
│   ├── EntityRenderer.ts
│   ├── TerrainMesh.ts
│   ├── LidarShaders.ts
│   └── LidarStyles.ts
├── views/              # Implementations of the IView interface
│   ├── LidarView.ts
│   ├── LobbyView.ts
│   ├── GlobeView.ts
│   └── SphereView.ts
├── ui/                 # DOM UI and input controllers
│   ├── ActionHUD.ts
│   ├── AvatarController.ts
│   └── FirstPersonControls.ts
├── assets/             # Static assets directory
├── tests/              # Unit tests and mocks
│   └── MockGameStateProvider.ts
├── RENDERING_ARCHITECTURE.md
├── README.md
├── main.ts             # Application entry point
└── mutonex.html        # Main entry HTML
```

## Pragmatic Steps for Reorganization

1.  **Draft Migration Script**: Create a temporary script to move files and update import paths (sed/grep). (Done)
2.  **Move Files**: Execute the move into the proposed subdirectories. (Done)
3.  **Update `mutonex.html`**: Ensure the entry script path is updated if necessary. (Done)
4.  **Update `deno.json`**: Update task paths for bundling if they refer to specific files. (Done)
5.  **Fix Imports**: Update internal relative imports across all files. (Done)
6.  **Verify Build**: Run `bash scripts/build-webclient.sh` to ensure bundling still works. (Done)
7.  **Verify Tests**: Run `bash src/webclient/tests/test.sh` to ensure no broken imports in tests. (Done)

## Documentation Updates

- Moved `ENTITY_MODELS.md` to `src/res/ENTITY_MODELS.md`.
- Refined `RENDERING_ARCHITECTURE.md` for succinct technical depth.
- Created `src/webclient/README.md` with the new structure.
