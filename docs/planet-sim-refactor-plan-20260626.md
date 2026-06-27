# Planet Sim Refactor Plan: Refined Data Model

**Date:** 2026-06-26
**Status:** Planning
**Target:** `Mutonex.Simtellus.Simulation` & `Planet`

## Priority Note: Design Cycle
While a persistent data-driven model is proposed here, a formal
design cycle must precede implementation. This cycle should
investigate if a pure functional approach can provide greater
simplicity or efficiency over a stateful data model for modeling
complex physical phenomena.

## Objective
Refactor the Simtellus engine to support a persistent, physical
data model for sectors. The primary goal is to move beyond simple
functional approximations and allow sectors to maintain state,
specifically a "Thermal Sum" for the crust and refined atmospheric
parameters.

## 1. Refined Sector Data Model

The current `initial_sector_state/0` and `calculate_sector_update/3`
logic in `simulation.ex` uses a transient map. This needs to be
expanded to a more robust structure.

### Proposed Structure (`SectorState` struct):
- `temperature`: Current atmospheric temperature (Celsius).
- `pressure`: Current atmospheric pressure (hPa).
- `thermal_sum`: Accumulated heat energy in the crust ($J/m^2$).
- `albedo`: Dynamic sector albedo (weighted PFT average).
- `pft_fractions`: Map of Plant Functional Type percentages.
- `temp_min`: High-precision daily minimum temperature.
- `temp_max`: High-precision daily maximum temperature.

## 2. Persistence & Thermal Sum

The "Thermal Battery" model requires persisting the energy state
of the ground between simulation turns.

### Mechanism:
- In each `update_simulation_for_date/2`, calculate the net
  energy flux ($Q_{net}$):
  $$Q = Solar_{in} - Refl - Rad + Geothermal$$
- Update `thermal_sum`: $T_{new} = T_{old} + Q \times \Delta t$.
- Derive the next turn's `temperature` partly from $T_{sum}$
  to simulate thermal inertia and night-time cooling.

## 3. High-Precision Temp Min/Max

Design and implement more accurate daily extremes derived from
the diurnal energy balance rather than simple offsets.

### Tasks:
- [ ] **Diurnal Extremes Model:**
  - Map $T_{max}$ to peak solar insolation and thermal lag.
  - Map $T_{min}$ to the end of the radiative cooling phase
    just before sunrise.
- [ ] **Integration with Persistent State:**
  - Store `temp_min` and `temp_max` in `SectorState` to allow
    long-term tracking of extreme anomalies.

## 4. Integration with Albedo & Geosphere

The refactored model acts as the state container for the new
physical modules.

### PFT Integration:
- On initialization, sectors calculate and store `pft_fractions`
  based on satellite data.
- The `albedo` is recalculated daily based on the Solar Zenith
  Angle and stored in the sector state.

### Geosphere Integration:
- Geothermal hotspots apply a local multiplier or additive
  constant to the `geothermal` term in the $Q$ equation.

## 5. Proposed File Changes

### `gameserver/lib/simtellus/simulation.ex`:
- Introduce a `SectorState` struct.
- Update `initial_sector_state/0` to populate PFT fractions.
- Update `calculate_sector_update/3` to perform energy balance
  calculations and update the persistent `thermal_sum`.

### `gameserver/lib/simtellus/planet.ex`:
- Update temperature/pressure functions to accept the new
  `SectorState` as context where appropriate.
