# Modular Configuration Refactoring Plan

This document outlines the strategy for modularizing the `gameserver` configuration to improve maintainability and follow the monorepo's architectural patterns.

## Context
As more hardcoded constants are refactored into the application environment, `config/config.exs` is growing. To keep it accessible and succinct (per `AGENTS.md`), we will split it into module-specific or system-specific files.

## Target Architecture
Split `config/config.exs` into:
- `config/engine.exs`: All logic and constants related to `Mutonex.Engine`.
- `config/net.exs`: Phoenix Endpoint, Router, and network-related settings.
- `config/config.exs`: Main entry point importing the modular files and common settings (Repo, Logger).

## Integration of Pending Feature Tasks
The following feature branches have associated TODOs that should be integrated into our workflow:

### 1. Kessler Sage (feat-kessler-sage)
- Integrate narrative NPC (retired physics teacher) triggers.
- Ensure LIDAR justifying mechanics are configurable.

### 2. Infra Click Test (feat-infra-click-test)
- Formalize test sector layout constants. [PARTIALLY DONE]
- Add automated click-test facility triggers.

### 3. NPC Indoctrination (feat-npc-indoctrination)
- Configure charm/indoctrination success rates and decay.
- Move society policy weights to `engine.exs`.

## Itinerary

1. **Split Config**: Move engine and net configurations to their respective files.
2. **Import Configs**: Update `config.exs` to import the new files.
3. **Externalize Remaining NPC Logic**: Move `@weights` from `NpcBehavior` to `engine.exs`.
4. **Narrative Integration**: Externalize Metheuspro (Kessler Sage) interaction parameters.
5. **Verify**: Run `mix test` and check application boot.
