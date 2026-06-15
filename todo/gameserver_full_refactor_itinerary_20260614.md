# Comprehensive Gameserver Refactoring Itinerary [COMPLETED]

This document outlines the roadmap for extending the refactoring successes of the `Mutonex.Engine` session to the entire `gameserver` codebase.

## Frame: AGENTS.md & Best Practices
- **Functional Style**: Pure functions and immutable state patterns.
- **Succinctness**: Functions < 11 lines, line length < 68 characters.
- **Accessibility**: Analytical nomenclature and documented technical rationale.
- **Data-Driven**: Externalized constants and modular configuration.

## Implemented Methods (from Engine Session)
1. **Config Externalization**: Move hardcoded constants from function blocks to `config/`.
2. **Config Modularization**: Functional split (e.g., `net.exs`, `simtellus.exs`).
3. **DRY Configuration Access**: Use `Mutonex.Utils.ConfigReader` for boilerplate-free lookups.
4. **Variable Lifting**: Declare all module and function variables at the start of blocks.
5. **Loop Optimization**: Lift config lookups and heavy logic outside iteration blocks.
6. **Functional Decomposition**: Break complex logic into descriptive, small helpers.

## Targets: Remaining Gameserver Modules

### 1. `Mutonex.Net` (Controllers, Channels, Plugs) [DONE]
- **Constants**: Move timeouts, broadcast names, and auth parameters to `config/net.exs`.
- **Endpoint**: Externalize session options (salt, max_age) from `Mutonex.Net.Endpoint`.
- **Logic**: Refactor `GameChannel` and `Auth` plug to follow variable lifting and length limits.
- **Nomenclature**: Ensure consistent usage of `ConfigReader`.

### 2. `Mutonex.Simtellus` (Simulation, Planet) [DONE]
- **Constants**: Externalize simulation intervals (sector size, default years) to `config/simtellus.exs`. Keep planetary physics (G, radius, axial tilt) and atmospheric constants in `Planet.ex` as module attributes.
- **Optimization**: Analyze heavy loops in `Simulation` (especially `update_simulation_for_date`) for variable lifting and lookup optimization.
- **Style**: Enforce < 11 line function limit on complex planetary calculations in `Planet.ex`.

### 3. `Mutonex.Utils` [DONE]
- **Resource**: Externalize hardcoded candidate paths from `Mutonex.Utils.Resource`.
- **MessageToken**: Ensure 32-byte entropy is configurable (if applicable) and audit for hardcoded defaults.
- **Nomenclature**: Verify all utilities follow the "Analytical Nomenclature" pattern established with `ConfigReader`.

### 4. `MutonexServer.Application` [DONE]
- **Children**: Refactor supervision tree definition for succinctness and variable lifting. Extract conditional logic into private helpers.

### 5. Performance, Efficiency, and Security Audit
- **CPU/Memory**: Lift redundant `ConfigReader` lookups into process state (GenServer `init` or `handle_continue`).
- **Data Structures**: Analyze `Simulation` for repeated string parsing in heavy loops.
- **Security**: Remove insecure fallback constants in `Auth` plug and ensure strict configuration.

## Itinerary

1. **Create `config/simtellus.exs`**: And migrate Simtellus-specific settings. Update `config.exs` to import it. [DONE]
2. **Refactor Simtellus Logic**: Apply lifting, optimization, and decomposition to `Planet` and `Simulation`. [DONE]
3. **Audit Net Logic**: Externalize remaining network constants and clean up `Endpoint` and `Channel` logic. [DONE]
4. **Utility Audit**: Refactor `Resource` and `MessageToken`. [DONE]
5. **Application Clean-up**: Refactor `MutonexServer.Application`. [DONE]
6. **Verify**: Full `mix test` and boot check. [DONE]
