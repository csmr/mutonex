# Webclient Refactor Cycle 3 Itinerary

Refactor main.ts and input/view/state architectures.

## Starting Point
- main.ts coordinates low-level input, game state, and views.
- High coupling across shortcut handlers, HUD, and views.

## Objectives
1. Introduce constants.ts for Phase and Scope definitions.
2. Enhance ViewManager.ts with high-level view actions.
3. Create GameStateManager.ts for entity and HUD data.
4. Create InputManager.ts for shortcuts and mouse bindings.
5. Simplify main.ts to high-level coordination only.
6. Analyze cause of LoC multiplication (~350 to >950 lines).
7. Investigate overengineering and LoC growth in code review.

## Itinerary
- [x] Task 1: Create webclient/core/constants.ts
- [x] Task 2: Enhance webclient/core/ViewManager.ts
- [x] Task 3: Create webclient/core/GameStateManager.ts
- [x] Task 4: Create webclient/input/InputManager.ts
- [x] Task 5: Refactor webclient/core/main.ts
- [x] Task 6: Verify build, run tests, and pre-commit checks
- [x] Task 7: Document Objective 6 LoC expansion analysis
- [x] Task 8: Document Objective 7 Overengineering investigation

## Objective 6 Results: Detailed LoC Expansion Analysis
1. Separation of Concerns (SoC) Architectural Boundaries:
   - Split main.ts (~350 LoC) across 4 target modules:
     * webclient/core/main.ts: 266 lines
     * webclient/input/InputManager.ts: 195 lines
     * webclient/core/GameStateManager.ts: 208 lines
     * webclient/core/ViewManager.ts: +86 lines added
     * webclient/core/constants.ts: 17 lines
     Total lines across cycle: 822 lines (2.3x expansion).

2. Class Boilerplate & Constructor Dependency Wiring:
   - InputManager class constructor & field declarations
     (webclient/input/InputManager.ts:11-23) added 13 lines of
     class boilerplate.
   - GameStateManager class constructor & field declarations
     (webclient/core/GameStateManager.ts:51-62) added 12 lines
     of map initializations.

3. Module Delegation & Wrapper Indirection:
   - InputManager.registerDiscrete (InputManager.ts:51-83):
     Wraps ViewManager actions (toggleView, toggleGlobe,
     cycleStyle, adjustEntropy) with handleEvent callbacks,
     adding 33 lines of pass-through delegation.
   - InputManager.registerNavAndDiag (InputManager.ts:98-118):
     Wraps handleLobbyAction and ViewManager.toggleDiag,
     adding 21 lines of delegation.
   - InputManager.registerRotation (InputManager.ts:120-137):
     Wraps ViewManager.rotate in a directory iteration loop,
     adding 18 lines of delegation.

4. Function Extraction Overhead (<11 Lines Constraint):
   - main.ts extracted sub-functions:
     * stepFaunaVector (main.ts:55-66): 12 lines
     * stepFauna (main.ts:68-76): 9 lines
     * triggerCharmAction (main.ts:41-58): 18 lines
     * updateHUDVisibility (main.ts:124-137): 14 lines
     * syncUI (main.ts:139-158): 20 lines
     * startLobbyAutoJoin (main.ts:160-169): 10 lines
     * initMainLobbySectors (main.ts:171-176): 6 lines

## Objective 7 Results: Code Review on Overengineering
1. Pass-Through Wrappers Without Added Value:
   - InputManager.handleEvent (InputManager.ts:39-49):
     Duplicates event.type checks already performed inside
     ShortcutEngine.handleKeyEvent (ShortcutEngine.ts:48-58).
   - ViewManager.cycleStyle (ViewManager.ts:79-85):
     Acts as a thin wrapper around LidarView.setLidarStyle
     without introducing new abstraction logic.

2. Duplicated State Synchronization Across Managers:
   - InputManager.pressedActions (InputManager.ts:12) and
     main.ts syncUI (main.ts:145):
     Both clear and mutate action set state during context
     switches, creating split ownership between InputManager
     and main.ts.
   - GameStateManager.entities (GameStateManager.ts:57) and
     main.ts updateEntitiesList (main.ts:200-212):
     GameStateManager stores entities while main.ts manually
     queries active views to trigger updateEntities.

3. Redundant View Matching & Guard Checks:
   - determineScope (main.ts:109-122) and updateHUDVisibility
     (main.ts:124-137):
     Both re-check viewSet.globeView and viewSet.sphereView
     independently instead of querying a single boolean getter
     (e.g., ViewManager.isGlobeScope()).

4. Recommendations for Future Cycles:
   - Replace class containers (InputManager, GameStateManager)
     with pure functional state transformers or plain objects.
   - Collapse pass-through wrappers directly into ShortcutEngine
     or View handlers to eliminate 120+ LoC of pure indirection.
