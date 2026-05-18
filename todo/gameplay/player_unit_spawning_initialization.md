# Session Initialization Sequence: The Great Egalitarian Spawn

## Goal: Combatting "RNG-Induced Rage"
As per GDD 1.3, the game experience starts with the `Head Unit` on the exoplanet surface. To ensure Mutonex remains a "Casual strategy for grown-ups" and not a "Lotto for lucky spawns," we must ensure that every player, regardless of their latitudinal destiny, begins with an equal opportunity to advance from exploration (Phase 1) to domain building (Phase 2).

## The Analytical Requirements

### 1. Equidistant "Starter Kit" Placement
- **The Triad**: Every player must have **3 NPC-buildings** (ruins/relics) spawned nearby.
- **The Radius of Fairness**: These buildings must be placed at a distance that is a multiple of the building-to-building perimeter (2km).
- **The Constraint**: Buildings should be spawned within a radius of **2,000m to 6,000m** (1x to 3x the perimeter) from the player's initial spawn point.
- **The Metric**: "Time-to-Charm." Given the `Head Unit` velocity (120 km/h) and movement costs, the travel time to the first follower candidate must be normalized across all players (approx. 1-3 turns of travel).

### 2. Terrain-Aware Spawn Distribution & Simtellus Integration
- **The Slope Limit**: Player spawn points must not be on extreme vertical terrain (slopes > 45°) to prevent "mountain trapping."
- **Simtellus Orchestration**: The `Simtellus` artifact module (the custodian of persistent ruins) should ideally be the authority for determining spawn positions. This ensures that player entry points are intelligently selected relative to high-value historical relics and available mineral resources.
- **Equidistance between Players**: In multiplayer sessions, `Simtellus` must select spawn points that are at least **20km apart** to allow for the 100km Power Projection expansion.

### 3. Relic Adoption Logic
- **Bones-file Priority**: Before generating new "generic" NPC-buildings, `Simtellus` queries for persistent artifacts within the player's 6km starter zone.
- **The "Adopt-and-Shift" Rule**: If a persistent relic exists within the zone, it is prioritized. If it's just outside (e.g. 7km), the engine may "adopt" it and treat it as a starter building to reward historical exploration.

## The Implementation Roadmap

- [ ] **Simtellus Spawn API**: Extend `Mutonex.Simtellus.Simulation` to provide a `get_fair_spawn_point(count)` function that considers terrain and artifact density.
- [ ] **The "Spawning Event" Hook**: A dedicated function in `GameSession` that calls the Simtellus API once all players have transitioned from the Lobby.
- [ ] **Parity Verification**: A logic check during initialization that ensures the sum of "Movement Cost to Nearest 3 Buildings" is within a 10% variance for all session participants.

## Witty Observation
*Ann, looking at the mountain range Jon used to hide his Power Structure, realized that Jon didn't just have better tactics—he had better 'Initialization Parity.' If Ann had started her french potassium charm offensive 2,000 meters closer to that mineral source, Jon's 'Starcraft of social gaming' ambitions might have been just another glitchy video-phone memory.*
