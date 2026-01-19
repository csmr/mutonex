# Comparison Report: GameSession Phases & Entity Changes

## Overview
This report compares the current branch (`HEAD`, which contains the Simtellus port) against `remotes/origin/feat-game-session-phases...`.

## Key Findings

### 1. GameSession Architecture
*   **Remote Branch (Improved):**
    *   **Phases:** Introduces explicit `:booting` phase. This correctly handles the asynchronous nature of Simtellus initialization (checking if it's available before allowing players to join properly).
    *   **Systems Pattern:** Extracts `Fauna` logic into `Mutonex.Engine.Systems.FaunaSystem`. This reduces the complexity of `GameSession` (Single Responsibility Principle) and makes testing easier.
    *   **Simtellus Integration:** The remote branch *already has* a `SimtellusClient` check in `init/1` and `handle_info(:check_simtellus)`, suggesting it was designed to work *with* a Simtellus service (likely the HTTP one).
*   **HEAD (Current):**
    *   **Phases:** Uses a simple timer-based `:lobby` transition. Simpler, but less robust if Simtellus is slow to start.
    *   **Monolithic:** Fauna logic is mixed into `GameSession`.

### 2. Entities
*   **HEAD (Current - Better):**
    *   Has a richer `GameState` definition including `minerals`, `conveyors`, and `buildings`.
    *   The remote branch appears to be older or focused on a subset of features, lacking these structural definitions.

### 3. Sparse Octree
*   **Remote Branch (Improved):**
    *   Contains optimization logic (`remove_by_position`) which is more efficient than the likely linear scan or full-tree search in HEAD.

## Recommendation

**Merge Strategy: Hybrid Approach**

We should **cherry-pick the architectural improvements** from the remote branch while **preserving the content/features** of the current branch.

1.  **Adopt `FaunaSystem`:** Extract the Fauna logic from `GameSession` into the new System module.
2.  **Adopt `:booting` Phase:** Update `GameSession` to use the `:booting` -> `:lobby` flow, using the new *internal* `Mutonex.Simtellus.Simulation` (via `SimtellusClient`) instead of the HTTP one.
3.  **Preserve Entities:** Keep the HEAD version of `entities.ex` to retain Minerals/Buildings support.
4.  **Adopt Octree Improvements:** Merge the optimizations from the remote `sparse_octree.ex`.

## Compatibility
The changes are largely compatible. The remote branch's `GameSession` calls `SimtellusClient.is_available?`. Since we just refactored `SimtellusClient` to use a GenServer, we need to ensure `SimtellusClient` exposes `is_available?` (which checks `Process.whereis(Mutonex.Simtellus.Simulation)`).

**Conclusion:** The remote branch offers significant architectural maturity (ECS-lite, robust startup phases) that should be integrated.
