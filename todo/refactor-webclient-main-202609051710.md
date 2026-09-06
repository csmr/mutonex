# Webclient Main Refactoring Plan

Google Jules agent multiplied the code lines from 360 to over
700 despite multiple attempts to direct it to stop
overengineering and introducing complex constructors and
getters, leading to a painful experience. This has basically
tripled the refactoring task workload, and this nonsense is what
we are now trying to sort out by planning the work into smaller
items.

## Remedy Analysis Integration & Assessment

Remedy-analysis confirms that previous refactoring attempts
failed to produce a succinct main.ts, mixing concerns and
retaining redundant logic.

### Key Remedy Analysis Findings

1. main.ts Still Does Too Much
- triggerCharmAction: Game logic -> Should be in GameStateManager.
- bindActionHUD: UI binding logic -> Should be in GameStateManager
  or ActionHUD.
- determineScope: Scope logic -> Should be in ViewManager.
- updateHUDVisibility: UI logic -> Should be in ViewManager or
  ActionHUD.
- syncUI: Coordination logic -> Should be split between
  ViewManager and InputManager.
- Remedy-analysis opinion: main.ts should only initialize
  modules, wire them together, and handle top-level lifecycle
  (e.g., DOMContentLoaded). It must not contain game, UI, or
  view logic.

2. Duplicated Logic
- determineScope and syncUI both check for globeView/sphereView.
- syncUI duplicates `isGlobe` check already done in determineScope.
- Remedy-analysis opinion: Redundancy causes a high maintenance
  burden. Changes to view logic require updates across multiple
  files when DRY is violated.

3. Keyboard Event Testing Leaks Into main.ts
- syncUI manually clears pressedActions and aborts cleanup
  controller.
- performSync is called from main.ts but relies on inputMgr
  internals.
- Remedy-analysis opinion: InputManager must fully encapsulate its
  own cleanup, shortcut activation, and context switching.

4. GameStateManager is Underutilized
- triggerCharmAction is in main.ts but operates on gsm.entities.
- bindActionHUD accesses provider and avatar directly.
- Remedy-analysis opinion: GameStateManager should own all game
  logic, including charm targeting, entity filtering, and HUD
  action binding.

5. ViewManager is Not Fully Leveraged
- determineScope and updateHUDVisibility remain in main.ts.
- syncUI manually checks active view and phase.
- Remedy-analysis opinion: ViewManager should be the single
  authority on active view state, scope mapping, and view-driven
  UI visibility.

## Target Architecture & Module Delegation

### Function Relocation Map
- triggerCharmAction -> GameStateManager
- bindActionHUD -> GameStateManager
- determineScope -> ViewManager
- updateHUDVisibility -> ViewManager / ActionHUD
- syncUI -> InputManager + ViewManager

### Succinct main.ts Pattern
main.ts is reduced to 50-80 LoC:
- Initialize ViewManager, LobbyView, ActionHUD, GameStateManager,
  and InputManager.
- Bind mouse events and debug console.
- Handle sector selection and main runLoop animation tick.

### Module Delegation Interfaces

#### ViewManager Enhancements
- `getScope(phase: string): ShortcutEngine.ShortcutScope`
  Maps active view (globe/sphere vs local) and phase to scope.
- `updateHUDVisibility(phase: string, lobby, hud)`
  Centralizes UI show/hide toggles based on active view and phase.

#### InputManager Enhancements
- `activateShortcuts(scope: ShortcutEngine.ShortcutScope)`
  Encapsulates AbortController cleanup and ShortcutEngine binding.
- `syncUI(viewManager: ViewManager, provider)`
  Delegates scope lookup and UI visibility, encapsulating context
  switches.

#### GameStateManager Enhancements
- `triggerCharmAction(avatar, provider)`
  Encapsulates entity distance filtering and charm action dispatch.
- `bindActionHUD(hud, avatar, provider)`
  Encapsulates HUD click handlers for charm, pickup, and drop.

## Itinerary (Small-Scoped Agent Execution)

- [ ] Task 1: Add ViewManager `getScope` & `updateHUDVisibility`
  - Move scope mapping and HUD visibility logic into ViewManager.
  - Unit test ViewManager scope determination.

- [ ] Task 2: Encapsulate shortcut switching in InputManager
  - Add `activateShortcuts` and `syncUI` methods to InputManager.
  - Move `pressedActions` cleanup into InputManager.

- [ ] Task 3: Move game action handlers to GameStateManager
  - Implement `triggerCharmAction` and `bindActionHUD` on GSM.
  - Remove charm/pickup/drop logic from main.ts.

- [ ] Task 4: Simplify webclient/core/main.ts
  - Strip inline logic, delegate setup to ViewManager and GSM.
  - Target line count: < 80 lines.

- [ ] Task 5: Verify build, run tests, and pre-commit checks
  - Run `bash webclient/build-webclient.sh`.
  - Run `bash .agents/test_webclient.sh`.
