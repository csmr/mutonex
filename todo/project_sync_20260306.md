# Mutonex Project Sync & Gap Analysis
**Date:** 2026-03-06

## 1. Executive Summary
There is a misalignment between the GDD, ROADMAP.txt,
and the actual implementation. While LIDAR is
advanced, the "Casual" mechanics (Turn-based logic,
Power Projection, Alliances) remain largely stubbed.

## 2. Milestone Alignment
*   **M1 (Design):** [DONE] GDD, technical blueprint,
    and rule calculator exist.
*   **M2 (Rules & Logic):** [IN PROGRESS] Core loop
    exists, but rules for charming and building
    are missing.
*   **M3 (Sim & AV):** [PARTIAL] Lidar is functional.
    Simtellus integration is live.
*   **M4 (Multiplayer):** [PARTIAL] WebSocket infra
    is in place, but Lobby/Voting is stubbed.

## 3. Implementation Status vs. GDD

| Feature | GDD Spec | Code Status | Action |
| :--- | :--- | :--- | :--- |
| **Turns** | 30s turns. | 20s ticks. | Implement gating. |
| **Mobility** | 120 km/h. | 8000 km/h. | Align constants. |
| **Charming** | Primary verb. | Stubbed. | Implement action. |
| **Power Proj** | 100km radius. | Stubbed. | Implement sight. |
| **Cataclysm** | Mid-game event. | Narrative. | Implement logic. |
| **Airpower** | Area denial. | Stubbed. | Implement type. |

## 4. The "Casual" Gameplay Challenge
The GDD emphasizes a "non-technical" experience.
*   **Issue:** Movement is too fast (8000 km/h).
*   **Fix:** Revert to the 120 km/h (Head) speed.
*   **Pacing:** 12-minute limit must be enforced.

## 5. Roadmap Reconciliation
Update `ROADMAP.txt` to show "Sector model" and
"Planet simulation" as implemented. Shift focus to
"Turn Based gameplay" and "Victory Rules".

## 6. Priority Sync Tasks
1.  **Gating Turns:** Move from real-time to turn-based
    gating in `GameSession`.
2.  **Constant Alignment:** Sync Elixir constants with
    `rule-calculator.rb`.
3.  **Building Functionality:** Implement Power
    Structure "Power Projection".
4.  **Action System:** Flesh out `Actions` module
    for `charm`, `attack`, and `build`.
