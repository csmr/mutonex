# Mutonex Technical Blueprint

This document defines the essential architectural paradigm of the Mutonex platform. The architecture has been refined and consolidated to improve system coherency and performance.

## Core System Architecture

The game platform operates on a modernized, unified infrastructure divided into three primary components:

### 1. Elixir Phoenix Gameserver
The core heart of Mutonex. The unified BEAM VM backend orchestrates concurrent connections, world simulation, and real-time state broadcasts. It is subdivided into three main functional domains:
- **Net (Auth/WebSockets)**: Handles the web routing, user account authentication via Phoenix, and persistent WebSocket channels for high-frequency multiplayer interaction.
- **Engine (Session/Octree State)**: The stateful domain using GenServers and Sparse Octrees. It manages session persistence, unit logistics, faction boundaries, and calculates spatial updates securely.
- **Simtellus (Exoplanet Simulation)**: Pure-function simulation mechanics governing solar/orbital dynamics, ecosystem progression, and terrain geometry, running at natively compiled speeds.

### 2. Bundler
The asset construction pipeline using container-driven processes to compile optimized browser bundles.
- **Implementation**: Managed by the `webclient_builder` container.
- **Technology**: Deno execution engine running fast `esbuild` tasks. Ensures modern JavaScript (ES6+), optimized static assets, and unified CSS are packaged seamlessly for the Gameserver's static directory.

See `src/webclient/GEOMETRY_STRATEGY.md` for the 3D geometry generation pipeline.

### 3. Browser Client
The front-end user experience delivered seamlessly through the browser.
- **Interface**: Uses modern Vanilla JS/TS alongside a robust Three.js integration for rendering both 3D perspective scenes (globe, lidar) and dynamic 2D lobbies.
- **Connectivity**: Connects to the Elixir backend via Phoenix WebSocket channels, receiving JSON `[id, x, y, z]` tuples to interpolate and animate game entities within the active view.

See `src/webclient/RENDERING_ARCHITECTURE.md` for the rendering pipeline and view system details.

## Hosting & Infrastructure

Mutonex leverages robust, declarative infrastructure as code configurations located in `infra/`:
- **GCP (Google Cloud Platform)**: Geared towards robustly scalable environments (e.g., GKE Autopilot) where control plane tasks are fully managed.
- **Hetzner**: A cost-effective, self-managed approach using docker-compose stacks directly on raw VMs to supply extreme pragmatism in server operations.

See `infra/README.md` for specific terraform and operational guidelines regarding deployment environments.

