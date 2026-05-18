# Feature: Terrain, Weather, and Latitude Movement Cost
**Date:** 2026-03-07

## 1. Requirement
*   **Context:** Unit movement speed must be dynamically calculated based on environmental factors to ensure strategic depth and realistic planetary simulation.
*   **GDD Reference:** Sections 4.1.1, 4.2.4, 4.2.5, and 4.3.

## 2. Velocity Formula
The target formula for actual velocity (`V_actual`) is:
`V_actual = (V_base * Lat_Multiplier * Weather_Multiplier) - Elevation_Penalty`

### Base Speeds (V_base):
- **Head:** 120 km/h
- **Chief:** 110 km/h
- **Activist:** 100 km/h
- **Local:** 80 km/h
- **Airpower:** 220 km/h (Special: limited flight hours)

### Multipliers and Penalties (from `rule-calculator.rb`):
- **Elevation Penalty:** `66` (cost per km). Actual formula: `V_actual = V_base - (Elevation_km * 66)`.
- **Latitude Penalty:** Starts at `50°` threshold. Penalty is `2` (km/h?) per degree beyond threshold.
- **Latitude Multiplier (GDD):** `1.0 - (floor(|Latitude| / 10) / 10.0)` (Example: at 60°N, multiplier is 0.4).
- **Weather Multiplier:** Derived from `Simtellus.Planet.temp` and `rain`. Extreme cold or storms reduce speed.

## 3. Implementation Challenges
- **Coordinate Derivation:** `GameSession` currently identifies sectors by `sector_id` (string). It needs to derive the center `lat/lon` to query `Simtellus`.
- **Elevation Data:** `TerrainGenerator` produces a normalized heightmap. It needs to be scaled to realistic "meters" (e.g., 0-8000m) for penalty math.
- **Asynchronous Environment Updates:** `GameSession` needs to periodically refresh its environmental cache (temp, weather) from the `Simtellus` simulation.
- **Pathfinding:** Moving across sectors with varying costs requires a fast A* implementation to estimate arrival times and validate move legality.

## 4. Itinerary
- [ ] **Phase A: Environment Integration**
    - [ ] Update `GameSession` state to include `latitude` and `longitude`.
    - [ ] Enhance `Environment.build/1` to fetch initial weather and temperature for the sector.
    - [ ] Implement `Environment.refresh_weather/1` to sync with `Simtellus` during the game loop.
- [ ] **Phase B: Elevation Scaling**
    - [ ] Modify `TerrainGenerator` or its consumer to scale heightmap values to absolute meters.
    - [ ] Implement `Terrain.get_elevation_at(x, z)` helper.
- [ ] **Phase C: Velocity Logic**
    - [ ] Implement a `MovementSystem` that calculates `V_actual` for a given unit and position.
    - [ ] Replace the hardcoded `@max_speed_ms` in `GameSession` with the dynamic calculation.
- [ ] **Phase D: Pathfinding (Advanced)**
    - [ ] Implement a grid-based A* to validate long-range paths (if applicable).
    - [ ] Update client-side UI to show "estimated travel time" based on terrain.

## 5. Scalability & Concurrency (Online Game Design)
Mutonex aims to support dozens of concurrent players per sector across hundreds of sectors.

### Concurrency Challenges:
- **GenServer Bottleneck:** High-frequency `avatar_update` messages (100ms interval) can overwhelm a single `GameSession` process. Movement validation logic must be extremely fast to avoid mailbox backpressure.
- **Asynchronous Validation:** Consider validating move legality asynchronously or in the client, using the server primarily as a coarse-grained authority to prevent cheating.

### Scalability Challenges:
- **Memory Footprint:** Storing a 2400x2400 16-bit heightmap per sector (approx. 11.5 MB per sector) across 648 sectors (36x18) would require ~7.5 GB of RAM.
    - *Solution:* Use `ETS` (Erlang Term Storage) for global terrain data instead of keeping it in GenServer state. Alternatively, load only "active" sectors or use memory-mapped binary chunks.
- **CPU Load (Pathfinding):** Running A* for dozens of NPC units across hundreds of sectors every turn will spike CPU.
    - *Solution:* Use a simplified 100x100 grid for "Strategic Pathfinding" instead of the full 2400x2400 resolution.
- **Global Clock Sync:** Ensure `Simtellus` state (weather/daynight) is updated centrally to prevent inconsistent speed penalties across neighboring sectors.
