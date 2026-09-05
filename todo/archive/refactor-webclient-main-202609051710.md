# Webclient Main Refactoring Plan

Refactoring doubled codebase, itinerary for fix follows. (DONE)

## Remedy Analysis Findings & Architectural Review

### 1. Main.ts Overreach and Responsibility Bleed
- `triggerCharmAction`: Game logic that belongs in
  `GameStateManager`.
- `bindActionHUD`: UI binding logic that should be handled by
  `GameStateManager` or `ActionHUD`.
- `determineScope`: View and scope mapping that belongs in
  `ViewManager`.
- `updateHUDVisibility`: UI visibility rules that belong in
  `ViewManager` or `ActionHUD`.
- `syncUI`: Context coordination logic that should be split
  between `ViewManager` and `InputManager`.
- Remedy-analysis opinion: `main.ts` must only initialize
  modules, wire dependencies, and trigger top-level lifecycle.

### 2. Duplicated Logic & DRY Violations
- View matching logic (`globeView` / `sphereView`) is repeated in
  both `determineScope` and `syncUI`.
- Remedy-analysis opinion: View type checks violate DRY and
  encapsulation; `ViewManager` should own view scope detection.

### 3. Input Leakage into Main.ts
- `syncUI` in `main.ts` directly clears `pressedActions` and
  aborts `cleanup.controller`.
- `performSync` couples `main.ts` to `inputMgr.handlers` and
  `inputMgr.pressedActions`.
- Remedy-analysis opinion: Context switching, shortcut activation,
  and input state clearing belong fully inside `InputManager`.

### 4. GameStateManager Underutilization
- `triggerCharmAction` sits in `main.ts` while operating on
  `gsm.entities`.
- `bindActionHUD` directly accesses `provider` and `avatar`.
- Remedy-analysis opinion: `GameStateManager` should encapsulate
  all game logic including target calculations and HUD action
  bindings.

### 5. ViewManager Underutilization
- `determineScope` and `updateHUDVisibility` sit in `main.ts`.
- `syncUI` manually inspects active view state.
- Remedy-analysis opinion: `ViewManager` should be the authority
  on active views, scope resolution, and view-driven HUD state.

## Omissions Analysis & Gap Identification
- **Render Pipeline View Instantiation**: `main.ts` currently
  instantiates `LidarView`, `SphereView`, and `GlobeView`
  manually in `initRenderPipeline`. Remedy code draft delegates
  view creation inside `ViewManager.initPipeline()`.
- **Globe Scope Helper**: `isGlobe` boolean check is repeated
  manually. `ViewManager` should expose `isGlobeScope()` or wrap
  it inside `getScope()`.

## Risk & Workload Estimates

- **T1: ViewManager Scope & Visibility Helpers**
  - Workload: Low (~30 LoC) | Risk: Low
  - Rationale: Pure view methods with minimal side effects.
- **T2: GameStateManager Game Logic & HUD Bindings**
  - Workload: Med (~40 LoC) | Risk: Med
  - Rationale: Interacts with Avatar and Provider state.
- **T3: Render Pipeline Initialization in ViewManager**
  - Workload: Med (~35 LoC) | Risk: Med
  - Rationale: WebGL canvas context and view set creation.
- **T4: InputManager UI Sync & Context Cleanup**
  - Workload: Med (~50 LoC) | Risk: High
  - Rationale: Shortcut cleanup & action state clearing.
- **T5: Main.ts Streamlining & Entrypoint Delegation**
  - Workload: High (~150 LoC) | Risk: High
  - Rationale: E2E wiring & animation loop coordination.

## Target Refactored Structure & Objectives

### Target Module Metrics
- `main.ts`: Reduce from ~266 LoC to ~50-80 LoC.
- `ViewManager`: Expose `getScope(phase)` & `updateHUDVisibility`.
- `InputManager`: Encapsulate shortcut switching & `syncUI`.
- `GameStateManager`: Encapsulate charm actions & HUD bindings.

## Additional Refactor Instructions

### Terse Technical Directives
- **Failure Cause**: Refactoring failed to create a succinct
  `main.ts` due to mixed concerns, redundant checks, and
  incomplete module delegation.
- **Responsibility Boundary**: `main.ts` must strictly handle
  module initialization, dependency wiring, and top-level DOM
  lifecycle events (e.g. `DOMContentLoaded`).
- **Domain Delegation**:
  - `triggerCharmAction` & `bindActionHUD` -> `GameStateManager`
  - `determineScope` & `updateHUDVisibility` -> `ViewManager`
  - `syncUI` -> split between `InputManager` and `ViewManager`
- **Encapsulate Scope Logic**: Centralize `globeView`/`sphereView`
  type checks inside `ViewManager.getScope(phase)` to eliminate
  DRY violations in `main.ts`.
- **Encapsulate Input State**: Move `pressedActions` clearing,
  shortcut context switching, and `AbortController` cleanup into
  `InputManager.syncUI(viewManager, provider)`.
- **Encapsulate Game Logic**: Move charm target calculation and
  HUD action handlers (`charm`, `pick_up`, `drop_item`) into
  `GameStateManager.bindActionHUD(hud, avatar, provider)`.
- **View Authority**: Expose `ViewManager.updateHUDVisibility` to
  encapsulate lobby/HUD show/hide logic based on active view.
- **Target Metrics**: Reduce `main.ts` to ~50-80 LoC of pure
  wiring, achieving low coupling and isolated testability.

## Multi-Cycle Implementation Itinerary

Divided into 3 distinct cycles to manage risk and workload.
Note: Refer to "Additional Refactor Instructions" during
implementation of each item.

### Cycle 4A: Core Domain Modules (Low Risk / Med Workload)
- [x] Task 1: Move scope & HUD visibility to ViewManager
  - Added `getScope(phase: string)` method to `ViewManager`.
  - Added `updateHUDVisibility` method to `ViewManager`.
  - Added unit tests in `webclient/tests/view_manager_test.ts`.
- [x] Task 2: Encapsulate game logic in GameStateManager
  - Moved `triggerCharmAction` into `GameStateManager`.
  - Moved `bindActionHUD` into `GameStateManager`.
  - Added unit tests in `game_state_manager_test.ts`.

### Cycle 4B: Input & Render Pipeline (Med Risk / Med Workload)
- [x] Task 3: Encapsulate ViewSet creation in ViewManager
  - Moved `LidarView`, `SphereView`, `GlobeView` instantiation into
    `ViewManager.initPipeline()`.
  - Simplified `initRenderPipeline` in `main.ts`.
- [x] Task 4: Move UI sync & input cleanup to InputManager
  - Added `activateShortcuts` & `syncUI` into `InputManager`.
  - Delegated `syncUI` to `ViewManager`.
  - Added unit tests in `input_manager_test.ts`.

### Cycle 4C: Entrypoint Streamlining & Verification (High Risk)
- [x] Task 5: Simplify main.ts to pure module wiring
  - Replaced manual helpers with module method calls.
  - Slimmed `main.ts` down to modular entrypoint wiring.
  - Verified application flow and auto-join.
- [x] Task 6: Verify build, run test suite, and check formatting
  - Built webclient bundle via `esbuild`.
  - Executed Playwright click verification on Chromium.
  - Verified zero regressions across view switches and inputs.

## Appendix: E2E Verification & Performance Profile

### Playwright E2E Validation Results
- **Lobby & Session Flow**: Successfully loaded sector list,
  handled sector selection ("Sector Alpha"), auto-hid lobby UI,
  and initialized in-game rendering pipeline.
- **Avatar & View Manipulation**: WASD movements registered;
  shortcut `'p'` toggled LidarView/SphereView; shortcut `'y'`
  switched to GlobeView.
- **Console Errors**:
  - Uncaught Page Errors: 0
  - Runtime JS Exceptions: 0

### Gameplay Performance & Memory Profile
```json
{
  "memory": {
    "totalJSHeapSizeMB": "34.16 MB",
    "usedJSHeapSizeMB": "20.56 MB",
    "jsHeapSizeLimitMB": "2144.00 MB"
  },
  "navTiming": {
    "domCompleteMs": "413.20 ms",
    "loadEventEndMs": "413.20 ms"
  },
  "screenResolution": "1280x720",
  "devicePixelRatio": 1
}
```
