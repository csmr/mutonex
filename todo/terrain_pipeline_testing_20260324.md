# Terrain Geodata Pipeline Testing and Implementation
**Date:** 2026-03-24

## 1. Requirement
The project is transitioning from procedural heightmaps to real-world GEBCO_2024 geodata (as outlined in `docs/terrain_geodata.md`). We need a systematic way to test the conversion pipeline and verify that the gameserver and webclient can consume the resulting 16-bit heightmaps.

## 2. Testing Strategy
Since the full GEBCO dataset is several gigabytes, we must provide a "Test Geodata" artifact that can be included in the repository or generated locally for CI/CD and local development.

### Phase 1: Test Artifact & Default Consumption
- [ ] **Content/Engine Split:** In branch `mainteinance-202303232008-engine-content-split-709370905147214257`, ensure all terrain-related generators move to `content-package/geodata/`.
- [ ] **Default Test Data:** Create a Python script `content-package/geodata/generate_test_geotiff.py` to generate a small (e.g., 240x240 pixels) synthetic GeoTIFF.
- [ ] **Out-of-the-box Experience:** The game should default to the test terrain TIFF consumption without source code modification.

### Phase 2: Pipeline Verification & Configurable Data Paths
- [ ] **Dynamic Discovery:** Modify the engine to check a configurable directory on startup for "fullblown" data.
- [ ] **Configuration:** Add `config :mutonex_server, terrain_data_path: "priv/static/geodata"` (or similar) to `config/config.exs`.
- [ ] **Priority:** If full data is available in the path, use it; otherwise, default to the test terrain.

### Phase 3: Gameserver Integration & Scaling
- [ ] **Scaling Fix:** The current terrain transport (JSON array in `GameState`) is unsuitable for 2400x2400 grids.
  - [ ] Implement a `BinaryTerrain` entity or use `priv/static` to serve PNGs directly to the client.
  - [ ] Server-side: Load 16-bit PNG into an efficient memory structure (e.g., `:ets` or a flattened binary) for O(1) height lookups during movement validation.
- [ ] Update `Mutonex.Engine.TerrainGenerator` to support loading terrain data from a file.
- [ ] Modify `Mutonex.Engine.Systems.Environment.build/1` to check for geodata slices when initializing "Sector Alpha".
- [ ] If the geodata file is missing, fallback to the current procedural generator.
- [ ] Reconcile `Sector Alpha` in `src/webclient/main.ts` with the chosen geodata coordinates.

### Phase 4: Ruleset Alignment
- [ ] Ensure `Mutonex.Engine.GameSession` movement validation correctly handles the 16-bit elevation values (subtracting the 12000 offset).
- [ ] Sync the Ruby `rule-calculator.rb` elevation penalties with the new 16-bit integer representation.

## 3. Implementation Details for Branch Context
The branch `feat-test-sector-fauna-units-202603232335` uses a random heightmap for Sector Alpha. The goal is to replace this with a deterministic, geodata-derived terrain to allow for repeatable testing of fauna spawning and unit movement.

## 4. Dependencies
- Python: `rasterio`, `numpy`, `opencv-python-headless`.
- Elixir: A way to decode 16-bit PNGs (e.g., a NIF, a Port, or a lightweight pure-Elixir PNG parser).
