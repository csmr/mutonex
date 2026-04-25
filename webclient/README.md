# Webclient Source

Deno/TypeScript browser client using a Three.js Strategy Pattern to decouple simulation state from rendering views.

For graphics pipeline details, see [RENDERING_ARCHITECTURE.md](./RENDERING_ARCHITECTURE.md).

## Directory Structure

```text
webclient/
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

## Build & Test

- **Bundle**: `bash webclient/build-webclient.sh` (outputs to `src/dist/`)
- **Test**: `bash webclient/tests/test.sh` (runs Deno unit tests)
