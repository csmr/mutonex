# TODO: Generative Powerstructure Geometry (L-System) Phase 2
**Date:** 2026-03-10

## 1. Requirement & Design
Implement procedural geometry generation for Society **Powerstructures** using a vertical-biased L-System.

*   **Proportions:** Vertical column/tower.
*   **Scale Constraints:** Min scale 6.0 (approx. Circus Tent size), Max scale 100.0 (Advanced).
*   **Driven by:** Society "Power Level" (sum of followers and buildings).

## 2. L-System Grammar Spec (Server-Side Source of Truth)
To ensure synchronization across all clients, the L-System **grammar rules** and **iteration counts** are managed by the gameserver. The server generates the L-System **string** (or deterministic parameters) and broadcasts it to all clients.

*   **Symbols:**
    *   `F`: Draw line forward (vertical growth).
    *   `+`/`-`: Rotate around Y axis (yaw).
    *   `^`/`&`: Rotate around X axis (pitch, limited to small angles to keep it vertical).
    *   `[` / `]`: Push/Pop state for branching.
*   **Axiom:** `F`
*   **Rules (Managed by Server):**
    *   `F -> F[+^F][-&F]` (Branching)
    *   `F -> FF` (Vertical Extension)
*   **Iterations:** Calculated by server based on Society Power Level.

## 3. Implementation Plan

### Phase 2.1: Server-Side Generation & Propagation
- [ ] Update `Mutonex.Engine.Entities.Building` struct in `src/gameserver/lib/engine/entities.ex` to include:
    - `power_level`: (integer) Sum of followers and buildings.
    - `lsystem_string`: (string) The generated L-System sequence (e.g., `FFF[+F]-F`).
- [ ] Implement `Mutonex.Engine.Systems.StructureGenerator` in Elixir:
    - Logic to generate the L-System string deterministically based on `power_level` and a building-specific `seed`.
    - Formula for iterations: `min(2 + floor(power_level / 10), 6)`.
- [ ] Update `Mutonex.Engine.Systems.Environment` to calculate these values upon building completion or society state change.

### Phase 2.2: Client-Side Geometry Interpreter
- [ ] Create `src/webclient/StructureGenerator.ts`:
    - Implement an `interpretLSystem(lsystemString: string)` function.
    - Parses the string and uses a "Turtle Graphics" approach to build a `THREE.BufferGeometry`.
    - Apply constraints: Total height is automatically determined by string length/iterations, but must be clamped/scaled between 6.0 and 100.0.
- [ ] Update `src/webclient/EntityRenderer.ts`:
    - Detect entities of type `building` with subtype `power_structure`.
    - Instead of (or in addition to) the static `🏰` (1F3F0) glyph, call `StructureGenerator` to create/cache a unique mesh.
    - Use `power_level` from the entity metadata to drive the generation.

### Phase 2.3: Visual Integration
- [ ] Ensure the generated structure is rendered in `LidarView`'s virtual scene.
- [ ] Verify the "vertical column" aesthetic matches the Cyber-Noir vibe.

## 4. Verification & Testing
- [ ] Mock a high-power society on the server and verify the Powerstructure appears taller in the webclient.
- [ ] Ensure low-power/starter societies have visible but small (scale 6.0) structures.
