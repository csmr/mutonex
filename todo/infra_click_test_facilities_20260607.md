# TODO: Gameplay 11 - Infra and Click-Test Facilities

## Goal
Improve the game's developer experience and infrastructure verification by implementing a comprehensive test sector and planet simulation diagnostic tools.

## Sector Features (Current Implementation)
- **ID-Based Configuration**: Sectors containing "test" in their ID trigger `apply_test_layout` in `Environment.build`.
- **Entity Row Spawning**: Existing logic for spawning rows of Units (Z=40), Items (Z=-40), and Buildings (Z=0).
- **Dynamic Faction Resolution**: Uses `FactionResolver` to assign random tribes and elements to test buildings.
- **Birthplace Association**: Units in the test sector are linked to `spawn_hub` buildings via the `birthplace` property.
- **Dummy Entities**: Automated injection of `dummy_player_alpha` and `npc_charmable_beta` for interaction testing.
- **Broadcast System**: State updates are pushed via Phoenix Channels (`GameChannel`) with `state_update` and `fauna_update` payloads.

## Requirements

### Test Sector Accessibility
- [ ] **Lobby Integration**: Update `webclient/LobbyView.ts` to include a "Test Sector" entry.
- [ ] **Hardcoded Entry**: Modify the lobby sector list to include `{ id: "game:sector_test", name: "Test Sector (All Units)" }`.

### Test Sector Layout (Refined)
- [ ] **Entity-Specific Rows**: Refine `gameserver/lib/engine/systems/environment.ex` to instantiate each entity category in its own dedicated row (e.g., Units at Z=40, Buildings at Z=0, Items at Z=-40).
- [ ] **Automated Archetype Discovery**: Explore iterating through `Mutonex.Engine.Entities` submodules or utilizing a centralized registry of archetypes in Elixir to automatically populate these rows when new types are added.
- [ ] **Test-Mode "Magic"**: Implement a mechanism to suppress standard behaviors for test entities (e.g., prevent fauna from wandering away or buildings from consuming energy) to ensure the test environment remains static and reproducible.
    - *Question*: How can we best flag these entities as "static/test-only" without polluting the core logic?
- [ ] **Mock Connectivity**: Ensure dummy players and charmable fauna are correctly instantiated for interaction testing.

### Simtellus Weather Diagnostics
- [ ] **Weather Data Export**: Implement a diagnostic endpoint in `Mutonex.Net.Controllers.DiagController` that returns historical weather (temperature, irradiance, rainfall) for a given sector.
- [ ] **Weather Report UI**: Create a "Test Weather Report" view in the webclient:
    - Display a table or chart of historical insolation and temperature.
    - Accessible via a debug key or a link in the lobby.
    - Allows verification that the planet simulation isn't "haywire".

### Gameplay Verification Test Design
- [ ] **Test-Approach Design**: Further design the verification approach for gameplay logic. This involves:
    - Defining expected outcomes for interactions (e.g., "Charming entity X should result in state Y").
    - Planning how automated tools (like Playwright or custom Elixir test runners) can navigate the test sector to verify these outcomes.
- [ ] **Interaction Logic Validation**: Use the test sector as a base for verifying:
    - Movement and terrain height sampling.
    - Charm actions and energy consumption.
    - Item pickup/drop and inventory persistence.

## Roadmap for Game Module Logic Changes

1. **Phase 1: Lobby & Access**
   - Add "Test Sector" to the webclient lobby.
   - Ensure the gameserver correctly traps `sector_test` and applies the test layout.

2. **Phase 2: Planet Simulation Transparency**
   - Add `get_history` functionality to `Mutonex.Simtellus.Simulation`.
   - Implement `Mutonex.Net.Controllers.WeatherController` and expose it via the router.
   - Build a basic HTML/JS weather report page served by the gameserver.

3. **Phase 3: Entity Expansion**
   - Centralize entity definitions so the test layout automatically picks up new types.
   - Improve the "birthplace" link between units and buildings in the test layout.

4. **Phase 4: Verification Suite**
   - Integrate the "Test Sector" into an automated browser test (e.g., Playwright).
   - Verify that all entities render correctly and don't cause shader errors.

## Closing Quote
> "We accept the reality of the world with which we're presented. It's as simple as that."
> — *The Truman Show*
