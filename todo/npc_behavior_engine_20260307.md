# NPC Behavior Engine Implementation

This TODO documents the requirements and open questions for the stochastic NPC behavior engine in Mutonex.

## Research & Requirements (from GDD & User Input)

### Stochastic Behavior Model
- NPC behavior is modeled as a selection from a table of possible actions.
- The **NPC Type** (Local, Activist, Chief, Fauna, Air Power) determines the *available* actions.
- The **NPC Type** and **Society Policy** (Aggressive, Defensive, Evasive, etc.) determine the *weight* of each action.
- A "stochastic engine" (weighted random selection) will choose the action for each tick.

### NPC Type Profiles (GDD 4.3)
| Type | Default Movement | Key Actions |
| :--- | :--- | :--- |
| **Local** | Noise-based | Work, Build, Wander, Follow Chief |
| **Activist** | Direct | Attack, Defend Area, Destroy Building |
| **Chief** | Direct | Charm, Lead Society |
| **Fauna** | Noise-based (Jitter) | Wander, Rest (Cannot be charmed) |
| **Air Power** | Patrol | Disable Area Units (Cannot be charmed) |

### Missing Details & Open Questions

#### Game Drama & Society Interactions
1. **Dynamic Weighting:** How do specific society events (e.g., losing a building, successful alliance) dynamically shift the weights for follower NPCs?
2. **Drama Thresholds:** Should there be "critical state" behaviors? For example, if a Chief is charmed, do the followers immediately flip policy to "Desperate" or "Evasive"?
3. **Internal Friction:** Can followers have individual "loyalty" weights that occasionally conflict with the Society Policy?

#### Logic & Implementation
1. **Movement vs. Action:** Is movement considered an "action" in the stochastic table, or is it the *result* of an action (e.g., "Wander" implies noise-based movement, "Attack" implies direct movement)?
2. **Policy Definition:** We need a concrete mapping of Policy -> Weights.
   - *Example:* Aggressive Policy might increase "Attack" weight for Activists and "Encroach" weight for Locals.
3. **Pathfinding & Cost:** The GDD mentions movement cost from elevation and terrain. How does the stochastic engine "look ahead" to weight movement directions if it's purely pseudorandom?
4. **Enforcement:** How is the "Area of Action" (Policy command) enforced in the stochastic selection?

## Tasks
- [ ] Implement `Mutonex.Engine.NpcBehavior` module with weighted random utility.
- [ ] Define initial behavior/weight maps for all NPC types.
- [ ] Integrate behavior selection into `FaunaBehavior` (and later `Unit` logic).
- [ ] Implement movement cost calculation (Terrain/Elevation).
- [ ] Implement basic pathfinding (A* or simplified gradient descent towards target).
