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

## Appendix: GDD Analysis & Pragmatic Path

### GDD Omissions & Errors
*   **Temporal Scaling Error:** GDD 4.9.3 suggests
    1 turn = 20 days, while 4.3.4 says 1 sector = 1 day.
    At 20 days/turn, units move 30+ sectors per turn,
    breaking the "chess-like" tactical pacing.
*   **Omission:** Victory scoring logic is vague.
    It needs a formula: `Score = f(Followers,
    Buildings, Minerals, Alliances)`.
*   **Omission:** The "Video-phone" meeting mechanic
    lacks technical turn-interaction rules.

### Pragmatic Implementation Path
1.  **Scale Fix:** Standardize 1 Turn = 17 Days
    (Authoritative). A 12-minute game represents
    ~714 in-world days (~2 years).
2.  **Iterative Rules:** Implement "Charming" first
    as it's the core differentiator.
3.  **Data-Driven:** Keep all speeds/times in a
    centralized Rules module to allow easy balancing
    via the Rule Calculator.
4.  **UI Feedback:** Ensure Lidar resolution and
    "Signal Lost" (Entropy) are visually distinct
    to communicate mechanics without text.
