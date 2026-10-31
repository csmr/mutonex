# Shortcut Implementation Analysis & Fix Itinerary (20260709)

## Technical Synopsis of Shortcomings
- **Context-Switch Race Condition**: Toggle actions (v, g, l) are triggered via `keydown`. These actions call `syncUI`, which aborts the current `ShortcutEngine` listener context and activates a new one. Because the debouncing cooldown was scoped to the activation call, the new context has a reset cooldown. This allowed browser-level key repeats to fire the same action in the *new* context immediately, causing a rapid revert or 'flicker'.
- **keyup Event Leakage**: Release events were being matched against the entire shortcut registry rather than just the active context. This caused release events for keys like 'g' to potentially trigger unintended logic if the context had just shifted.
- **Repeat Fire Cycles**: Discrete actions (e.g., 'l' for Lidar styles) were firing multiple times per tap because they lacked module-level cooldowns and `!e.repeat` guards.
- **Focus & Mapping Conflicts**: 'Tab' interferes with browser UI focus. 'd' has duplicate mappings between movement and diagnostics.
- **Runtime Crashes**: `GlobeView` failing to implement `updateEntities` terminated the main simulation loop upon view switch.

## Technical Itinerary (Defensive Order)

### 1. Engine Core Stabilization (`ShortcutEngine.ts` & `ShortcutConfig.ts`)
- [x] **Global Cooldown**: Move `lastTapTime` to module scope in `ShortcutEngine.ts` so debouncing persists across context transitions.
- [x] **Isolated keyup**: Ensure `keyup` events only propagate for 'hold' actions (movement/rotation) within the *current* active context.
- [x] **Browser Protection**: Apply `e.preventDefault()` to all matched shortcuts to stop focus shifts and scroll interference.
- [x] **Re-mapping**: Reassign `toggle_view` to 'v' and `toggle_diag` to 'p' in `ShortcutConfig.ts`.
- [x] **Action Metadata**: Tag all continuous actions (WASD, Arrows) with `hold: true` and discrete toggles with `repeat: false`.

### 2. Interface Compliance (`GlobeView.ts`)
- [x] **Contract Satisfaction**: Implement `updateEntities` and `updateTerrain` as safe no-ops to prevent main loop `TypeError`.

### 3. Application Layer Hardening (`main.ts`)
- [x] **Phase Tracking**: Ensure `currentPhase` and `activeView` are correctly updated to prevent infinite `syncUI` loops.
- [x] **Discrete Guarding**: Add explicit `!e.repeat` and `e.type === "keydown"` checks to toggle handlers.

### 4. Infrastructure Integrity (`infra/compose.yaml`)
- [x] **State Restore**: Restore Postgres volume paths and full image names to the user's preferred state from commit `f0dc407`.

## Debugging Plan
- Trace context switches in `ShortcutEngine`.
- Verify cooldown effectiveness for 'l' key.
- Monitor `currentPhase` stability in the browser console.
