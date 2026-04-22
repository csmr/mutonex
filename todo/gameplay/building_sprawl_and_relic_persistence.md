# Building Sprawl & Relic Persistence: The Great Urban Reset

## The Problem: The "Spawn Camping" Paradox
As per GDD 1.3, every player deserves a fair start—a "Starter Kit" of resources and NPC-buildings (relics) to charm. However, GDD 3.1 also demands a "Bones-file" style persistence where the ruins of past civilizations (failed sessions) litter the exoplanet.

If we just dump buildings randomly, we end up with "Building Sprawl"—a LIDAR nightmare where Powerstructures are so close they look like a geometric cactus. We need an elegant way to handle both the *Global Persistence* of ruins and the *Local Spawning* of fair-start buildings, while enforcing a healthy distance between these structural ego-monuments.

## The Analytical Requirements

### 1. The "Social Distancing" Perimeter (Spatial Logic)
- **Minimum Distance**: A hard limit of **2,000 meters** (2km) between independent building instances.
- **Why?**: To preserve the "Power Projection" (DD 1.3) aesthetic. A 100km radius view is less impressive if your neighbor's spire is in your personal space.
- **The Loophole**: Infrastructure modifiers (Conveyor Belts, Fiber Optics) are exempt. They are the "connective tissue" of the domain and should sprawl freely.

### 2. Dual-Layer Persistence (State Management)
- **Session Layer**: Volatile buildings created during a match. They are "Active" and project power.
- **Simtellus Layer**: When a session ends, surviving buildings are "de-activated" and sent to the Simtellus Simulation as **Relics** (GDD 3.1).
- **Relic Reclamation**: In new sessions, the engine should check the Simtellus state for nearby relics. If they are far enough (2km+) from the player's fair-start zone, they are manifested as "ruins" ready to be charmed.

### 3. The "Fair Start" Seeding (Procedural Logic)
- **Guaranteed Spawns**: Upon player `head_unit` spawn, the engine must force-spawn **3 NPC-buildings** within a 1km to 5km radius, ignoring existing Simtellus relics if they would violate the 2km spacing.
- **Conflict Resolution**: If a Simtellus relic exists exactly where a fair-start building should be, "adopt" the relic instead of spawning a new one.

## The Implementation Roadmap

- [ ] **Engine/Entities update**: Add `perimeter_radius` to `Building` struct (defaulting to 2.0km for Powerstructures).
- [ ] **Spatial Query logic**: Update `Mutonex.Engine.Systems.Environment` to use the octree to verify the 2km gap before spawning new `Building` entities.
- [ ] **Relic Pipeline**: Implementation of a "Graveyard Shift" process that moves session buildings to `Mutonex.Simtellus.Simulation` artifacts upon session closure.
- [ ] **The "Charmable Ruin" conversion**: Logic to transform a persistent artifact (Simtellus) into an active session entity (Engine) when a player discovers it.

## Witty Observation
*If a tree falls in the forest and no one is around to LIDAR-scan it, does it still have a collision box? In Mutonex, it probably becomes a Relic. Let's make sure our buildings don't end up like a 20th-century suburban sprawl; keep them spaced, keep them significant, and keep them persistent.*
