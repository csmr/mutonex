# Gameserver Profiling and Optimization Itinerary

This document tracks the systematic analysis and optimization of the `gameserver` to minimize memory footprint and maximize CPU efficiency.

## Frame: AGENTS.md & Best Practices
- **Pragmatic**: Focus on high-impact bottlenecks identified by data.
- **Succinct**: Implement optimizations with minimal complexity and code bloat.
- **Accessible**: Document technical rationale for performance-critical logic.
- **Standards**: Functions < 11 lines, lines < 68 chars, variable lifting.

## Toolset
- **Profiling**:
    - `:fprof` & `mix profile.fprof`: Deep execution traces (high overhead).
    - `:eprof` & `mix profile.eprof`: Time profiling per function/process.
    - `:cprof` & `mix profile.cprof`: Call count analysis (low overhead).
- **Diagnostics**:
    - `mix xref`: Dependency and circular reference analysis.
    - `:observer`: Real-time process and memory monitoring.
    - `:dialyzer`: Static type analysis and dead code detection.

## Quantified Findings

### 1. Static Analysis (`mix xref`)
- **Circular Dependencies**:
    - `Cycle 1 (Length 6)`: `FaunaSystem` -> `Endpoint` -> `UserSocket` -> `GameChannel` -> `GameSession` -> `Environment` -> `FaunaSystem`.
    - `Cycle 2 (Length 4)`: `Endpoint` -> `UserSocket` -> `GameChannel` -> `GameSession` -> `Endpoint`.
- **Impact**: These cycles increase compilation times and can complicate testing and module separation.

### 2. Execution Hot Spots (`mix profile.eprof`)
- **`Mutonex.Simtellus.Planet.irradiance_daily_wm2/2`**:
    - `incident_angle/3`: ~25-42% of execution time depending on sector count.
    - `declination_angle/1`: ~10-27% of execution time.
    - Total calls per simulation day: 24 (hourly) * 186 (sectors) = 4,464 calls.
- **Redundant Math Operations**:
    - `Planet.declination_angle/1` performs multiple trig operations (`:math.cos`, rad conversion) and is called 4,464 times per day, even though its value only changes once per day.
    - `Planet.solar_irradiance_wm2/1` is called 2,418 times per day but is also constant per `yearday`.

## Refactorings/Fixes Motivated by Findings

### 1. Optimization of `Planet` Module
- **Memoization**: Cache `declination_angle` and `solar_irradiance_wm2` for the current simulation day to reduce repeated math operations. (Refactored 20260615)
- **Pre-calculation**: Lift constant simulation values outside the hourly loop in `irradiance_daily_wm2`. (Refactored 20260615)

### 2. Optimization of `Simulation` Module
- **Data Structure**: Switched from string-formatted keys (`"0_0"`) to tuple keys (`{0, 0}`) for sector states to avoid string interpolation and parsing overhead. (Completed 20260614)
- **Lifting**: Configuration lookups (`sector_size`) lifted out of hot update loops. (Completed 20260615)

### 3. General Clean-up
- **Unused Code**: Removed dead functions and unused parameters identified during profiling.
- **Decomposition**: Broke down complex `tick_sector` logic to adhere to AGENTS.md limits.

## Future Implementation

### 1. Architecture Refactoring
- **Dependency Flattening**: Investigate moving broadcast logic to a dedicated notifier module to break the `GameSession` -> `Endpoint` cycle.
- **Circular Dependency Break**: Target flattening the 6-module cycle starting with `FaunaSystem`.

### 2. Deep Memory Audit
- **Binary Fragmentation**: Audit large binary/map allocations in `GameState` using `:observer`.
- **Process Heaps**: Use `Process.info` to identify and optimize memory-heavy GenServers in large simulations.

### 3. Spatial Index Optimization
- **Call Count Analysis**: Audit high-frequency function calls in the spatial index (`SparseOctree`) using `mix profile.cprof`.

## Itinerary

### 1. Static Dependency Analysis (`mix xref`) [DONE]
- [x] Run `mix xref graph` to identify circular dependencies.
- [x] Run `mix xref cyclix` to find potential compilation bottlenecks.

### 2. Execution Time Profiling (`mix profile.eprof`) [DONE]
- [x] Profile `Mutonex.Simtellus.Simulation` updates (hot loop).
- [x] Profile `Mutonex.Simtellus.Planet` calculations.
- [x] Identify functions consuming > 10% of execution time.

### 3. Implementation of Optimizations [DONE]
- [x] Lift constant calculations outside of loops.
- [x] Replace high-frequency string operations with tuple operations.
- [x] Decompose hot loops into < 11 line functions.

### 4. Verification & Benchmarking [DONE]
- [x] Re-run profiling after each major change to quantify gains.
- [x] Ensure full `mix test` suite passes (no regressions).
