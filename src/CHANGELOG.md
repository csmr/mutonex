# Changelog

## v0.2.19 - Orange Lidar Rendering
- **Game Engine & Systems:**
    - Shifted default Lidar rendering mode to use an orange Point-Cloud-Lidar palette (1700K - 3800K), matching original design document.
## v0.2.18 - The Consolidation Release
- **Backend Consolidation:**
    - Replaced Deno webserver with Phoenix static asset serving, simplifying architecture.
    - Ported Simtellus (Ruby) to Elixir GenServer, achieving near-zero latency for simulation calls.
    - Implemented `Mutonex.Net.Router` and specialized controllers for health, diagnostics, and SPA entry.
- **Game Engine & Systems:**
    - Introduced "Systems" architecture with `FaunaSystem` and `FaunaBehavior`.
    - Added `SparseOctree` spatial partitioning for high-performance entity management.
    - Implemented Society, Mineral, and Building logic based on `rule-calculator.rb` constraints.
    - Refactored `GameSession` into a state machine with `:booting`, `:lobby`, and `:gamein` phases.
- **Webclient Refactor:**
    - Implemented `LidarView` with GPU-accelerated rendering and scan resolution toggling.
    - Added `LobbyView` for sector selection and real-time player queue visualization.
    - Unified rendering under `ViewManager` using the Strategy pattern.
    - Integrated extruded Unicode geometry assets for all game entities.
- **Infrastructure & Tooling:**
    - Added Terraform scripts for GCP (GKE Autopilot) and Hetzner (Docker Compose on VPS).
    - Ported advanced geodata processing scripts (`slice_geodata.py`) for terrain geodata import.
    - Improved developer experience with `devenv.sh` and automated credential/salt generation.
- **Security:**
    - Integrated SHA-256 API key hashing and header-based authentication in the network pipeline.

## v0.1.0-3d-websocket-poc
- Proof of Concept: 3D render static scene in the browser
- Proof of Concept: WebSocket connection to Elixir/Phoenix game server
- Dummy state payloads and scene.

## 2025-10-30 to 2025-11-24
- Add gameserver lidar and ray intersection modules and tests.
- Fix gameserver get simtellus state.
- Update webclient logic and dependencies.
- Finish client-render and websocket PoC.

## 2025-08-13 to 2025-08-21
- Finalize simtellus.
- Add gameserver entities, session, channels.
- Add gameserver tests.
- Add .env.template.
- Add ci.yml build-actions.
- Add AGENTS.md and dependency installer.

## 2025-03-06 to 2025-04-27
- Improve factions.
- Add Elixir gameserver container and core stub.

## 2025-02-04 to 2025-02-09
- Add database and webserver base.
- improve codebase, bootstrapping, bundling.
- API key and unique credentials.

## 2024-10-21 to 2024-12-14

### Added
- Add dependency installer.
- Add dev-container config and runner.
- Add bundler for client.
- Add contribs to client script.
- Add simtellus container, server.rb, simulation.rb.


## 2023-10-20 to 2024-11-15

### Changed
- Improve simtellus tests.
- Add tests simtellus/planet_tests.rb.


## 2023-05-15 to 2023-05-16

### Added
- Add simtellus/planet.rb.

### Changed
- Clean up ruleset.
- Add limits logic to rule-calculator.


## 2022-11-03

### Added

- Changelog.md


## 2022-08-22 to 2022-10-14

### Changed

- Added concept art.
- Design Document finalized.

### Removed

- Blockchain spec obsoleted: not a good fit for a in-game score board, as 1. clients are known and 2. the game server is the score authority. So instead: a scoreboard on the server.


## 2022-07-21 to 2022-08-04

### Changed

- Project renamed to Mutonex.
- Sector equals geographic coordinates of geodesic World globe. For base arena subdivision, 18x36 might be enough, 10 degree sector.
- Movement cost

### Removed
- Arena subdivision: fixed sectors mapped on World globe is a wack idea. Since the scenario is post-mini-apocalypse and tech-tree doesn't allow fast travel, gameplay should not be based on units traveling a lot of ground. Emphasis on lidar & network capacities, charm ability and social dynamic, plus reducing entropy.


## 2021-09-04 to 2022-06-05

### Added

- License
- Idea dump
- Contributor credits
- Buildscript
- Accessibility spec
- Design Document
- Rule calculator

### Changed

- Game specification and design


## 2021-09-01

- Public repository
