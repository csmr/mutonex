# TODO: Gameplay 10 - Fauna and Unit Test Sector Implementation

## Goal
Implement a specialized test sector for verifying fauna behaviors, unit spawning, and entity rendering in a controlled environment.

## Requirements

### Unit & Building Upgrades
- [ ] Implement `birthplace` property for units (linking to a building).
- [ ] Implementation of unit spawning from buildings when energy reserves are sufficient.

### Fauna Upgrades
- [ ] **Energy Collection**: Stationary fauna (plants/trees) collect sector energy relative to their size (mapping Simtellus temp/energy state).
- [ ] **Spawning Mechanism**: Stationary fauna act as "spawn buildings" for moving fauna.
- [ ] **Size-Based Spawning**: Implement rule where stationary fauna spawn moving fauna of similar or smaller size (using scale metadata from `glyph_profiles.json`).
- [ ] **Iteration Logic**: Re-attempt spawn until the moving unit size $\le$ stationary unit size.

### Energy & Spawning Arithmetic
- [ ] **Collection Rule**: $Energy/Turn = Scale \times SectorWatts$ (e.g., $0.2 \text{ scale} \times 200W = 40W$).
- [ ] **Spawn Cost Rule**: $Cost = UnitScale \times 10,000$ (Watts).
- [ ] **Constraint**: Maximum scale of spawned unit is limited by parent's energy, not parent's scale.
- [ ] **Sector Prop**: Add `sector_energy` (watts/m²) to simulation state.

### Energy Lifecycle & Faction
- [ ] Implement energy consumption for all units/buildings.
- [ ] Implement "mummification" behavior (visual/state failure) when energy reaches 0.
- [ ] Update Faction logic: if region is undefined, randomize tribe and flavor from all resources.
- [ ] **UI Design**: Decide on faction display method (HUD text, entity labels, etc.).

### Test Sector Layout
- [ ] Implement `Test Sector (Units & Fauna)` with random terrain and fauna.
- [ ] Add a row of every **Unit** entity (Z=40).
- [ ] Add a row of every **Item** and **Object** entity (Z=-40).
- [ ] Add a row of every **Building** type (Z=0?).
- [ ] Deploy dummy placeholder buildings as unit birthplaces.

## Verification Plan
- [ ] Visual verification of all units/items in rows.
- [ ] Unit tests for energy collection logic.
- [ ] Integration tests for fauna spawning cycle.
- [ ] Simulation tests for sector energy dynamics.
