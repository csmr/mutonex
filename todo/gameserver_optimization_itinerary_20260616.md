# Gameserver Optimization Itinerary (2026-06-16)

This document outlines the systematic implementation of performance and architectural optimizations for the `gameserver`, building upon initial profiling results.

## Frame: AGENTS.md Standards
- **Pragmatic**: Data-driven optimizations targeting confirmed bottlenecks.
- **Succinct**: Maintain < 11 line functions and < 68 character line limits.
- **Functional**: Prefer pure transformations and immutable data structures.
- **Secure**: Ensure no regression in security or authentication logic.

## Targets

### 1. Dependency Flattening & Circular Dependency Resolution
- **Break `GameSession` -> `Endpoint` cycle**: Decouple the engine from the network layer by introducing a notification/broadcast abstraction.
- **Resolve `FaunaSystem` 6-module cycle**: `FaunaSystem` -> `Endpoint` -> `UserSocket` -> `GameChannel` -> `GameSession` -> `Environment` -> `FaunaSystem`.
- **Impact**: Improved compilation speed, better test isolation, and cleaner architecture.

### 2. Deep Memory Auditing
- **Heap Analysis**: Audit `GameState` and large GenServer processes for memory bloat using `Process.info` and `:observer`.
- **Binary Fragmentation**: Identify and resolve potential binary fragmentation in high-throughput data paths.

### 3. Spatial Index Optimization
- **Hot Path Analysis**: Audit `Mutonex.Engine.SparseOctree` using `mix profile.cprof` to identify high-frequency function calls.
- **Efficiency Gains**: Optimize octree traversal and updates to reduce CPU overhead in high-density entity simulations.

## Itinerary

### Phase 1: Diagnostics & Refinement
- [x] Run `mix xref graph` to confirm current cycle lengths and members.
- [x] Execute `mix profile.cprof` on a simulated high-load session to audit `SparseOctree`.
- [x] Use `Process.info` to capture heap statistics of the `GameSession` and `Simulation` processes.

### Phase 2: Architectural Decoupling
- [x] Implement `Mutonex.Net.Notifier` (or similar) to abstract Phoenix PubSub broadcasts.
- [x] Refactor `GameSession` to use the Notifier instead of direct `Endpoint` calls.
- [x] Re-route `FaunaSystem` interactions to break the 6-module dependency chain.

### Phase 3: Memory & Spatial Optimization
- [x] Optimize `SparseOctree` based on `cprof` findings (lifting, pre-calculation, or algorithm refinement).
- [x] Address any identified memory bloat or fragmentation in the engine state.

### Phase 4: Verification
- [x] Verify no regressions via `mix test`.
- [x] Compare post-optimization profiling results with Phase 1 benchmarks.
- [x] Complete pre-commit checklist.

## Optimization Report (Succinct)

### 1. Structural Outcomes
- **Circular Dependencies**: Reduced from **2 cycles (length 6 and 4)** to **0 cycles**.
- **Coupling**: Engine modules (`GameSession`, `FaunaSystem`) are now fully decoupled from `Mutonex.Net.Endpoint` via the `Notifier` behavior.

### 2. Computational Efficiency (Audit: 1000 entities, 100 queries)
- **`List.replace_at/3`**: Reduced from **16,000 calls** to **0** (Eliminated O(N) list traversal in octree updates).
- **`List.do_replace_at/3`**: Reduced from **70,075 calls** to **0**.
- **Distance Calculation**: Transitioned to `distance_sq/2`, eliminating **23,500 calls** to `:math.sqrt` during spatial queries.
- **`intersects?/3`**: Simplified bound extraction (removed 52,100 redundant `is_tuple` and `List.to_tuple` calls).

### 3. Maintainability
- **AGENTS.md Compliance**: All modified files brought under 68-character line limits and 11-line function limits.
