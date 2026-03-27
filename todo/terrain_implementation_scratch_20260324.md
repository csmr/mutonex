# Implementation Plan: Terrain Pipeline Phases 1 & 2 (Scratch)
**Date:** 2026-03-24
**Status:** DRAFT

This document outlines the immediate technical steps to implement and verify the terrain geodata pipeline using a synthetic test artifact.

## Phase 1: Test Artifact Generation

### 1.1 Content-Package Organization
- Move existing generators from `src/res/geodata/` to `content-package/geodata/`.
- Ensure `content-package/build.sh` (or `devenv.sh`) handles installation into the engine (`src/gameserver/priv/static/geodata`).

### 1.2 Create `generate_test_geotiff.py`
- Location: `content-package/geodata/generate_test_geotiff.py`
- Logic:
  - Create a 240x240 (1 degree) or 2400x2400 (10 degree) `numpy` array of `float32`.
  - Populate with a known gradient (e.g., from -500.0m to +500.0m).
  - Define GeoTransform: `(-180.0, 15/3600.0, 0, 90.0, 0, -15/3600.0)` for global alignment.
  - Set CRS to `EPSG:43200` (WGS 84).
  - Save as `TEST_GEBCO.tif`.

### 1.3 Execution
```bash
cd content-package/geodata
python3 generate_test_geotiff.py
```

## Phase 2: Pipeline Verification & Configurable Engine

### 2.1 Engine Configuration (Elixir)
- In `config/config.exs`:
  ```elixir
  config :mutonex_server,
    terrain_data_root: System.get_env("TERRAIN_DATA_ROOT") || "priv/static/geodata"
  ```
- The engine will priority-load terrain from this directory if available.

### 2.2 Slicing Pipeline
- Run `slice_geodata.py` against `TEST_GEBCO.tif`.
```bash
python3 slice_geodata.py
```

### 2.3 Verification Checks
- **File Existence:** Ensure `slices/N90W180/sector.png` (or appropriate coordinate) exists.
- **Data Integrity:**
  - Open `sector.png` with a tool that supports 16-bit grayscale (e.g., `opencv` or `ImageMagick`).
  - Verify pixel values match `Elevation + 12000`.
  - Example: A 0m elevation in the TIFF should be exactly 12000 in the PNG.
- **Binary Format (Optional):** If the server prefers raw binaries, verify that a conversion script from PNG to `.bin` (flat `uint16_t` buffer) works correctly.

## Phase 3: (Self-Correction/Note) Scaling Concern
The current `Terrain` struct in Elixir uses a nested list `data: []` which is serialized to a JSON array.
For a 2400x2400 grid, this is 5.76 million integers.
- JSON size: ~15-30 MB.
- This will cause significant latency in WebSocket `after_join` pushes.
- **Fix:** The implementation plan for Phase 3 MUST include transitioning to binary terrain transport or client-side loading of the PNG slice directly from the static asset server.
