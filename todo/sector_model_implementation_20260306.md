# Feature: Comprehensive Sector Model Implementation
**Date:** 2026-03-06

## 1. Requirement & Birds-Eye View
A sector must provide enough space and visibility for
meaningful "domain" management. The player needs to
see the area around their Power Structure (up to 100km
diameter projection).
*   **Visibility:** Ensure Lidar rendering supports a
    wide enough FOV for birds-eye view operations.
*   **Infrastructure:** Each sector is a `GameSession`
    instance. Validate performance for high unit counts.

## 2. Pacing & Casual Gameplay
Unit speeds must be conducive to 30s turns.
*   **Base Speeds:** 120 km/h (Head), 80 km/h (Local).
*   **Calculations:** A unit should move ~1km per turn
    at base speed. This maintains the "chess-like" feel.

## 3. Terrain & Movement Logic
*   **Elevation Modeling:** `TerrainGenerator.ex` must
    export data to the `UnitSystem` for velocity math.
*   **Velocity Formula:** `V_actual = V_base *
    Multiplier(Elevation_Gradient) * Multiplier(Weather)`.
*   **Pathfinding:** Implement a fast, grid-based A* or
    Dijkstra for travel time estimations.

## 4. Environment & Energy (Coordinate-Dependent)
Sector coordinates (Lat/Lon) drive the simulation:
*   **Weather:** Affects unit velocity (wind/snow) and
    fauna spawning rates.
*   **Energy Input (Insolation):** Drives Power
    Structure output.
*   **Comms/Lidar:** High entropy (weather/sunspots)
    causes "signal lost" in communications and Lidar
    resolution drops.

## 5. Technical Improvements & GDD Gaps
- [ ] Improve `GameSession` to handle per-sector
      weather/insolation state from `Simtellus`.
- [ ] Implement "Fast Pathfinding" in Elixir for
      unit movement validation.
- [ ] Add `elevation` lookup to unit movement logic.
- [ ] Implement `EntropySystem` to simulate comms
      and lidar degradation.
- [ ] Ensure `Power Projection` radius is dynamic
      based on building height and energy.
