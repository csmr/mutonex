# TODO: Gameplay 11 - Infra and Click-Test Facilities

## Goal
Improve the game's developer experience and infrastructure
verification by implementing a comprehensive test sector and
planet simulation diagnostic tools.

## Sector Features (Current Implementation)
- **ID-Based Configuration**: Sectors containing "test" in
  their ID trigger `apply_test_layout` in `Environment.build`.
- **Entity Row Spawning**: Existing logic for spawning rows of
  Units (Z=40), Items (Z=-40), and Buildings (Z=0).
- **Dynamic Faction Resolution**: Uses `FactionResolver` to assign
  random tribes and elements to test buildings.
- **Birthplace Association**: Units in test sector are linked to
  `spawn_hub` buildings via the `birthplace` property.
- **Dummy Entities**: Automated injection of `dummy_player_alpha`
  and `npc_charmable_beta` for interaction testing.
- **Broadcast System**: State updates are pushed via Phoenix
  Channels (`GameChannel`) with `state_update` and `fauna_update`
  payloads.

## Requirements

### Test Sector Accessibility
- [ ] **Lobby Integration**: Update `webclient/view/LobbyView.ts`
  to include a "Test Sector" entry.
- [ ] **Hardcoded Entry**: Modify the lobby sector list to include
  `{ id: "game:sector_test", name: "Test Sector (All Units)" }`.

### Test Sector Layout (Refined)
- [ ] **Entity-Specific Rows**: Refine `Environment.ex` to
  instantiate each entity category in dedicated rows (Units at
  Z=40, Buildings at Z=0, Items at Z=-40).
- [ ] **Automated Archetype Discovery**: Explore iterating through
  `Mutonex.Engine.Entities` submodules or utilizing a central
  registry of archetypes in Elixir.
- [ ] **Test-Mode "Magic"**: Implement a mechanism to suppress
  standard behaviors for test entities to ensure the test
  environment remains static and reproducible.
- [ ] **Mock Connectivity**: Ensure dummy players and charmable
  fauna are correctly instantiated for interaction testing.

### Simtellus Weather Diagnostics
- [x] **Weather Data Export**: Implement diagnostic endpoint in
  `Mutonex.Net.Controllers.DiagController` returning historical
  weather (temperature, pressure, irradiance) for a sector.
- [ ] **Weather Report UI**: Create a "Test Weather Report" view
  in the webclient:
    - Display a table or chart of historical insolation/temp.
    - Accessible via debug key or link in the lobby.
    - Allows verification that simulation isn't "haywire".

### Gameplay Verification Test Design
- [ ] **Test-Approach Design**: Further design the verification
  approach for gameplay logic.
- [ ] **Interaction Logic Validation**: Use test sector to verify:
    - Movement and terrain height sampling.
    - Charm actions and energy consumption.
    - Item pickup/drop and inventory persistence.

## Roadmap for Game Module Logic Changes

1. **Phase 1: Lobby & Access**
   - Add "Test Sector" to the webclient lobby.
   - Ensure gameserver traps `sector_test` and applies test layout.

2. **Phase 2: Planet Simulation Transparency**
   - Add `get_history` functionality to `Simulation`.
   - Implement `DiagController.weather_history` API endpoint.
   - Build weather report view in webclient (`GlobeView.ts`).

3. **Phase 3: Entity Expansion**
   - Centralize entity definitions for automatic archetype loading.
   - Improve birthplace link between units and buildings.

4. **Phase 4: Verification Suite**
   - Integrate "Test Sector" into automated browser tests.
   - Verify all entities render without shader errors.

## Closing Quote
> "We accept the reality of the world with which we're presented.
> It's as simple as that."
> — *The Truman Show*
