# Keyboard Shortcut & UI View Context Map Analysis

This document analyses the keyboard event handling
interplay with the DOM and update loop, and compares the
stabilization and fix branches to prepare for synthesis.

## 1. Event Handling, DOM, and the Application Loop

Keyboard events are intercepted globally at the window object.
To prevent leaking keystrokes into input fields, focus checks
are executed on `document.activeElement`.

When keys are pressed, they map to game actions:
- **Discrete Actions**: Switch view (Lidar/Sphere), toggle
  globe, or toggle diagnostics. Suppressed via a 250ms
  cooldown to prevent rapid toggle bouncing.
- **Hold Actions**: WASD movement or globe rotation. Handled
  statefully via a set of pressed actions, polled in the main
  update loop.

Context switches (e.g. switching from Game to Globe View)
require clean boundary transitions. `syncUI()` aborts the previous
listener context and activates the appropriate subset of key
bindings for the new view, clearing any active hold states to
prevent "stuck key" runaways.

## 2. Fix Branches Comparative Analysis

We analyze three separate branches resolving these bugs:

### A. view-toggles-stabilization-18010577147581674041
- **Focus**: Adds strict `event.type !== "keydown"` guards
  on discrete actions, protecting them from unexpected keyup/
  repeat events.
- **Scope Alignment**: Binds WASD globe camera rotation to are
  both Globe and Sphere scopes.
- **Reversion Prevention**: Resets active movement bindings
  via `pressedActions.clear()` inside `syncUI()`.

### B. feat-view-toggle-shortcuts-20260710-4027298756145615959
- **Focus**: Re-maps key layout to prevent overlapping bindings:
  - Switching views: `'p'`
  - Globe View toggle: `'y'`
  - Weather Diag Mode: `'i'`
  - Entropy (Noise) adjustment: `'u'` / `'o'`
  - Globe View rotation: `'w'`, `'s'`, `'a'`, `'d'`
- **Scope Alignment**: Refines bindings in `ShortcutConfig.ts`
  to match this modern layout.

### C. view-toggle-fix-504453420270215715
- **Focus**: Introduces a module-level `pressedKeys` set inside
  `ShortcutEngine.ts` to keep track of physical key state.
- **Repeat & Blur Isolation**: Rejects subsequent `keydown`
  events for already pressed keys (ignoring OS repeat). Adds a
  window `"blur"` listener to flush keys on window defocus.
- **Test Integrity**: Adds robust unit tests verifying cooldown,
  cooldown with keyup releases, repeat rejection, and keyup
  hold-only constraints.

## 3. Synthesis Plan

We will synthesize these approaches into a single premium
keyboard shortcut system:
1. Adopt the layout of `'p'`, `'y'`, `'i'`, `'u'`, `'o'`, and
   WASD-based rotation.
2. Port physical key state tracking (`pressedKeys`, blur listener,
   re-entrancy checks) from the `view-toggle-fix` branch.
3. Apply `syncUI()` context updates, ensuring `pressedActions`
   are cleared upon context sync.
4. Keep terminal console styling highly legible, using dark
   or black text colors.
