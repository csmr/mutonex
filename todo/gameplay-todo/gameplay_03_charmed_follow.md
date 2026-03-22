# TODO 03: Charmed Units Follow Behavior

**Context:**
Currently, NPCs and fauna entities move entirely randomly during their discrete `tick` lifecycle (`FaunaBehavior.move/1`). We want to implement a behavior where charmed entities (units whose `society` or `society_id` attribute points to a "charmant" unit like a player) will preferentially move *toward* their charmer if they are within a "nearby" radius (50-100 meters).

This behavior should execute during the existing server-side entity resolution cycle, but we should not enforce constant tracking (which looks unnatural and stresses the server).

## Requirements

1. **Leverage the Tick Cycle:**
   - For Fauna: Inject movement biases into the existing `Mutonex.Engine.FaunaBehavior` module. When `FaunaSystem.process_tick/2` pulses, `FaunaBehavior.move/2` should be updated to accept the player states and evaluate distance.
   - For regular Units: If regular Units also pulse (e.g. within `GameLoop` or `GameSession`), their move calculation must similarly evaluate their `society_id`.

2. **Distance Evaluation (Bounding / Radius):**
   - The game uses 1.0 units = 1 KM. Therefore 50-100 meters = `0.05` to `0.1` coordinate units.
   - Fetch the position of the entity's "charmant" (the target player string found in `society_id` or `society`).
   - If the distance is `< 0.1` and `> 0.01` (to prevent merging/clipping directly into the player), calculate a directional vector towards the player and blend it with the random wander jitter.

3. **Performance (Spatial Index):**
   - Use the `Mutonex.Engine.SparseOctree` to rapidly find nearby units if searching for "highest charm nearby" rather than directly polling the `society` string ID (though direct map lookup by ID is O(1) and cheaper if the society ID is absolute).

## Architectural Guidelines to Follow (`AGENTS.md`)
- **Functional Style:** Do not mutate deeply nested state imperatively. Use Elixir `with` statements or `->` pipeline transformations to calcuate the new `dx/dz` vector.
- **Short Blocks/Succinctness:** Break the vector math into a private helper function `calc_attraction_vector(pos, target_pos, strength)` to keep functions under 11 lines.
- **Data-Driven Rules:** Do not hardcode the 0.1 radius into the `if` statement. Add module attributes like `@charm_follow_radius_km 0.1` and `@charm_follow_speed_km 0.04`.
