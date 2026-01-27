# Merge Itinerary: Consolidation Branch Integration

## Overview
This itinerary outlines the steps to merge the infrastructure and logic improvements from `merge-consolidation-202512242240-1617179119544665211` into the current `feat-game-module-consolidation-202601202022` branch.

## 1. Infrastructure Improvements
The remote branch introduces a proper Router and Diagnostics controller, replacing or augmenting the basic `Endpoint` plugs.

- **Files:**
    - `src/gameserver/lib/net/router.ex` (New)
    - `src/gameserver/lib/net/controllers/diag_controller.ex` (New)
    - `src/gameserver/test/mutonex/net/controllers/diag_controller_test.exs` (New)
- **Action:**
    - Copy these files from the remote branch.
    - Update `src/gameserver/lib/net/endpoint.ex` to plug the new `Mutonex.Net.Router`.

## 2. Logic Improvements
### Fauna Behavior
The remote branch refines fauna movement speed to be more realistic (40 km/h simulation).
- **File:** `src/gameserver/lib/engine/fauna_behavior.ex`
- **Action:** Overwrite with remote version.

### Config & Mocks
New testing infrastructure was added.
- **Files:**
    - `src/gameserver/test/support/mocks.ex` (New)
    - `src/gameserver/config/test.exs` (Update)
- **Action:**
    - Copy `mocks.ex`.
    - Update `config/test.exs` to include `mocks.ex` in compilation paths (if not auto-handled) or just ensure config is aligned.
    - *Note:* Our current branch *already* has mocks in `test_helper.exs`. We should consolidate: move mocks to `support/mocks.ex` as per the remote branch's cleaner structure.

## 3. Geodata Tools
New Python scripts for terrain data import.
- **Files:**
    - `src/res/geodata/` (New directory and scripts)
    - `docs/terrain_geodata.md` (New documentation)
- **Action:**
    - Copy the `src/res/geodata` directory and contents.
    - Copy the documentation.

## 4. Verification
- Run `mix test` to ensure the new `DiagControllerTest` passes and existing tests (GameSession) still pass with the new Router structure.
- Verify `FaunaBehavior` logic change by inspection (no regression in compilation).

## Merge Strategy
1.  **Infrastructure:** Add Router/Controller files.
2.  **Wiring:** Modify `Endpoint` to use Router.
3.  **Logic:** Update `FaunaBehavior`.
4.  **Support:** Add `mocks.ex` and `geodata/`.
5.  **Test:** Verify everything.
