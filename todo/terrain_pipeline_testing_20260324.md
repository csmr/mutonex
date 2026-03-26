# Terrain Geodata Pipeline Testing and Implementation
**Date:** 2026-03-24

## 1. Requirement
The project is transitioning from procedural heightmaps to real-world GEBCO_2024 geodata (as outlined in `docs/terrain_geodata.md`). We need a systematic way to test the conversion pipeline and verify that the gameserver and webclient can consume the resulting 16-bit heightmaps.

## 2. Testing Strategy
Since the full GEBCO dataset is several gigabytes, we must provide a "Test Geodata" artifact that can be included in the repository or generated locally for CI/CD and local development.

### Phase 1: Test Artifact Generation
- [ ] Create a Python script `src/res/geodata/generate_test_geotiff.py` that generates a small (e.g., 240x240 pixels), valid GeoTIFF file with known elevation patterns (slopes, pits, peaks).
- [ ] This script should use `rasterio` and `numpy` to ensure compatibility with the existing `slice_geodata.py`.

### Phase 2: Pipeline Verification
- [ ] Run `slice_geodata.py` against the test GeoTIFF.
- [ ] Verify that it produces a valid 16-bit grayscale PNG with the expected `+12000` elevation offset.

### Phase 3: Gameserver Integration (Sector Alpha)
- [ ] Update `Mutonex.Engine.TerrainGenerator` to support loading terrain data from a file (PNG or raw binary).
- [ ] Modify `Mutonex.Engine.Systems.Environment.build/1` to check for a `sector.png` or `sector.bin` in `src/res/geodata/slices/N00E000/` (or similar) when initializing "Sector Alpha".
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
