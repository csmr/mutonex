# Mutonex Project Master Tracking Document

**Date:** 2026-06-17
**Status:** Phase II - Tactical Engine Development

## 1. Executive Summary
Mutonex has established a solid architectural foundation (Phase I). Current efforts are focused on the "Tactical Engine" (Phase II), transitioning from a real-time sandbox to a "chess-like" casual strategy game. Recent refactoring (v0.2.26) has optimized core spatial queries and decoupled the engine from the network layer.

---

## 2. Priority Phase II: Tactical Engine (Current)

### A. Turn Gating & Pacing
- [ ] **Turn-Based Gating**: Transition `GameSession` from 5s real-time ticks to authoritative 20-30s turns. (Ref: `project_sync_20260306.md`, `gameplay_06_lidar_refresh_pacing.md`)
- [ ] **LIDAR Refresh Rates**: Throttle client-side rendering to "sweeping bursts" synchronized with turn pacing.

### B. Power Projection & Domain Sight
- [ ] **Sight Radius Expansion**: Implement Powerstructure height-based visibility (up to 100km radius). (Ref: GDD 1.3)
- [ ] **Shared Sight**: Implement alliance-based sight sharing in the gameserver logic.

### C. Unit/Player Unification
- [ ] **Head Unit Full Integration**: Ensure all players spawn as `:head` Units with `charm`, `inventory`, and `energy` attributes. (Ref: `gameplay_01_player_unit_unification.md`)
- [ ] **Energy Lifecycle**: Implement energy depletion, collection (fauna), and "mummification" at 0 energy. (Ref: `gameplay_10_test_sector_fauna_units.md`)

### D. Advanced Action System
- [ ] **Building Verbs**: Implement `build_conveyor`, `build_powerstructure`, and `build_fiber`. (Ref: `Mutonex.Engine.Actions`)
- [ ] **Attack/Defend Verbs**: Implement activist unit area-denial and building destruction logic.

---

## 3. Narrative & Sensory Immersion

### A. The "Orange World" Lore
- [ ] **Narrative Integration**: Ground the 2400K orange aesthetic in the Nitrogen Dioxide / Yellowcake Fallout story. (Ref: `gameplay_05_orange_atmosphere_narrative.md`)
- [ ] **Kessler Sage (Meproteus)**: Implement the first-charmed guide NPC to bridge Phase 1 to Phase 2. (Ref: `gameplay_11_kessler_sage_narrative_20260606.md`)

### B. Audio-Visual Feedback
- [ ] **LIDAR Audio Pings**: Directional audio "echolocation" when the sensor beam hits charmable units. (Ref: `gameplay_07_lidar_audio_pings.md`)
- [x] **GlobeView Earth Outlines**: Bright green country borders for geographic tribe/ethnicity determination. (Ref: `earth_map_wireframe_20260228.md`)
- [x] **Weather Testing Facility**: Diagnostic GlobeView with 5-year meteo-table and insolation overlay. (Ref: `weather_testing_facility_20260617.md`)
- [ ] **Keyboard Refactor**: Centralize shortcuts into data-driven config for binding and guides. (Ref: `webclient_shortcuts_refactor_20260619.md`)
- [ ] **Voxel Model Audit**: Fix incomplete fauna models (e.g., floating heads). (Ref: `gameplay_08_incomplete_fauna_models.md`)

---

## 4. World Persistence & Interaction

### A. The Relic System
- [ ] **Relic Pipeline**: Move session buildings to Simtellus persistent state upon session closure. (Ref: `building_sprawl_and_relic_persistence.md`)
- [ ] **Spatial Perimeter**: Enforce 2km "Social Distancing" between major buildings.

### B. Social Dynamics
- [ ] **Videophone Meets**: Implement the remote voting/charming interface. (Ref: GDD 4.9)
- [ ] **NPC Indoctrination**: Implement pseudo-identities and "hallucination" exclamations for ideologically captured NPCs. (Ref: `npc_indoctrination_20260526.md`)

---

## 5. Completed & Archived Milestones (Recent)
- [x] **v0.2.26 Optimization**: Eliminated circular dependencies, O(1) Octree updates, squared-distance queries.
- [x] **v0.2.26 Security**: XSS mitigations, constant-time API key verification, SAST baseline.
- [x] **Modular Config**: Externalized engine, net, and simtellus constants.
- [x] **Local Bootstrap**: Unified `devenv.sh` and `.agents/agent_setup.sh` bootstrapping via `app.config.sh` to ensure `priv/static` placeholder existence.

---

## 6. Guidelines (AGENTS.md)
- **Succinct**: Functions < 11 lines, lines < 68 chars.
- **Pragmatic**: Data-driven logic over imperative checks.
- **Secure**: No hardcoded secrets, environment-driven config.
