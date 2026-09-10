# TODO: Planet Simulation State & Moyai Sculpture Persistence

**Date:** 2026-09-08
**Status:** Planned / High Priority

## 1. Overview & Objective
Refactor the simulated planet (`Simtellus`) building and fauna
persistence across game sessions to use a serializable planet
simulation instance state.

## 2. Requirements

### A. Serializable Planet Simulation State
- Implement a serializable instance state representation for
  `Mutonex.Simtellus.Simulation` covering sector energy,
  temperature, pressure, historical meteo stacks, fauna
  populations, and persistent building artifacts.
- Enable state export and re-hydration to preserve world history
  between gameserver restarts.

### B. Session Closure Building Transformation
- **Moyai Sculptures**: When a game session closes, most
  surviving session buildings transition into **Moyai
  sculptures** (`:moyai`) in the persisting layer, acting as
  monumental relics.
- **No-Build Radius**: Moyai sculptures enforce a **500-meter
  no-build radius** (`perimeter_radius: 500.0` / 0.5km) to
  protect historical monument grounds.
- **Follower Criteria**: Buildings that have active followers
  inside when the session ends are persisted **as-is**
  (retaining their building type and attributes).
- **Fauna Buildings**: Biosphere fauna buildings/spawners are
  always persisted **as-is** to preserve fauna reproduction cycles.

## 3. Implementation Roadmap
- [ ] Implement `Simtellus.Simulation` state serialization
  schema and JSON/EET export/import callbacks.
- [ ] Refactor `GameSession.persist_relics/1` and
  `Environment.building_to_artifact/1` to inspect follower
  counts and map non-follower buildings to `:moyai` types with
  500m perimeter radius.
- [ ] Update `Environment.valid_building_perimeter?/3` to respect
  500m perimeter rules for Moyai relics.
- [ ] Add unit tests verifying Moyai transformation logic and
  follower persistence criteria.
