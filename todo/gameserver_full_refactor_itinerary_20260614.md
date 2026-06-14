# Comprehensive Gameserver Refactoring Itinerary

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

### 1. `Mutonex.Net` (Controllers, Channels, Plugs)
- **Constants**: Move timeouts, broadcast names, and auth parameters to `config/net.exs`.
- **Logic**: Refactor `GameChannel` and `Auth` plug to follow variable lifting and length limits.
- **Nomenclature**: Ensure consistent usage of `ConfigReader`.

### 2. `Mutonex.Simtellus` (Simulation, Planet)
- **Constants**: Externalize planetary physics, weather rates, and simulation intervals to `config/simtellus.exs`.
- **Optimization**: Analyze heavy loops in `Simulation` for variable lifting and lookup optimization.
- **Style**: Enforce < 11 line function limit on complex planetary calculations.

### 3. `Mutonex.Utils`
- **Audit**: Review `Resource` and `MessageToken` for hardcoded paths or parameters.
- **Nomenclature**: Verify all utilities follow the "Analytical Nomenclature" pattern established with `ConfigReader`.

### 4. `MutonexServer.Application`
- **Children**: Refactor supervision tree definition for succinctness and variable lifting.

## Itinerary

1. **Create `config/simtellus.exs`**: And migrate Simtellus-specific settings.
2. **Refactor Simtellus Logic**: Apply lifting, optimization, and decomposition.
3. **Audit Net Logic**: Externalize remaining network constants and clean up Channel logic.
4. **Utility Audit**: Ensure all utilities follow the new nomenclature and config patterns.
5. **Verify**: Full `mix test` and boot check.
