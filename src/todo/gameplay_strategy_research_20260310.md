# Mutonex Gameplay Strategy Research & Design

## Goal
Establish a clear Mutonex gameplay rhythm and social strategy. While the 3D domain-building (Powerstructures + GeoTIFF terrain) and LIDAR mechanics are solidifying, the core social interaction and progression loops need definition to ensure long-term engagement and avoid micromanagement or toxic "tragedy" scenarios (winner-takes-all annihilation).

## Context
- **Rhythm:** ~20 seconds per turn, steady pace (no click-fest), casual entry.
- **World:** 3D Earth (GeoTIFF) divided into Sectors. Starting in FPS perspective, evolving to RTS "birds-eye" view via Powerstructures.
- **Goal:** To be the "Starcraft of social gaming online."
- **Key Mechanics:** No micromanagement, autonomous units, "Charming" dynamics (turning followers), Alliance systems.

## Research Findings: Essentials for 3D Domain/Social Games
Based on online research of successful 3D domain-building and social alliance games, the following elements are critical for Mutonex to incorporate into its design document:

1. **Clear Objectives & Progression Loops**
   - *Micro-goals*: Gathering initial resources, establishing the first Powerstructure.
   - *Macro-goals*: Sector dominance, building high-tier structures, forming large alliances.
   - *Progression*: The transition from FPS (exploration) to RTS (domain management) is a massive hook. This transition must feel earned and significantly expand gameplay verbs.

2. **Social Alliance & "Charming"**
   - *Interdependence*: True success (e.g., controlling a Sector) must be near-impossible for a solo player. Mechanics must incentivize alliances (shared LIDAR sight radius, defensive bonuses).
   - *The Charm Mechanic*: Turning followers must be a core social verb. It needs rules—is it based on Powerstructure magnitude? Proximity? A specific resource cost? It shouldn't just be an RNG dice roll; it needs strategic depth.
   - *Shared Goals*: Alliances need a reason to exist beyond non-aggression. Shared building projects or shared defense against natural entropy.

3. **LIDAR & Environmental Storytelling**
   - *Information is Power*: The LIDAR rendering is fundamentally tied to sight radius. Upgrading LIDAR (point cloud -> scanline) or sharing sight with allies creates information asymmetry, a core RTS staple.
   - *Terrain (TDS)*: The Terrain Distance Function should make certain GeoTIFF sectors highly strategic (e.g., mountain passes, resource-dense valleys), driving conflict or cooperation over specific coordinate ranges.

4. **Avoiding "The Tragedy" (Endgame)**
   - *Win States*: If the only goal is to wipe out the opponent, the game devolves into a stressful deathmatch (contrary to "casual").
   - *Egalitarian Co-experience*: Mutonex must introduce win states or endgame conditions based on cooperative artistic achievements, massive shared Powerstructures, or surviving extreme planetary entropy events together.

## Next Steps
- [ ] Define the exact mechanics of the "Charm" ability (range, cost, success rate).
- [ ] Diagram the UI/UX flow for the FPS-to-RTS transition upon building a Powerstructure.
- [ ] Blueprint the "Shared Sight" mechanic for alliances within the game server logic.
- [ ] Draft an endgame scenario that rewards "Egalitarian Co-experience" over total annihilation.
