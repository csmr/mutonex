# Feature: Advanced Gameplay - Airpower & Cataclysm
**Date:** 2026-03-06

## 1. Narrative Context
World reset due to Missile Defense failure. EMP
waves destroyed the grid. Sky is orange due to
MEO+LEO and nuclear debris. Mid-game, a second
"Orbital Cataclysm" occurs as debris re-enters.

## 2. Feature: Airpower Unit
*   **Role:** Strategic area-denial unit.
*   **Behavior:** Moves at 220 km/h. "Disables" units
    in its sector. Cannot be charmed.
*   **Implementation:** Add `disabled` flag to `Unit`.
    Implement AoE check in game loop.

## 3. Feature: Orbital Cataclysm
*   **Timing:** Triggers at 50% game time (Turn 12).
*   **Effects:**
    *   **Nuclear Winter:** Reduced solar energy.
    *   **Strikes:** Random damage to structures.
    *   **EMP:** Temporary loss of Lidar sight.
*   **Implementation:** `CataclysmSystem` generates
    strikes. `Simtellus` supports modifiers.

## 4. Implementation Tasks
- [ ] Define `:airpower` in `Entities.Unit`.
- [ ] Implement `Mutonex.Engine.Systems.CataclysmSystem`.
- [ ] Add event broadcasting for "Cataclysm Start".
- [ ] Implement "Disable" mechanic for units.
- [ ] Update `GameSession` for environment shifts.
