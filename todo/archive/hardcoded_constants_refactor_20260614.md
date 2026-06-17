# Refactoring Candidates: Hardcoded Constants [COMPLETED]

This document identified hardcoded constants in the `gameserver` engine codebase that have been moved to configuration blocks to improve maintainability and accessibility.

## Candidates List

### 1. `Mutonex.Engine.GameLoop` [DONE]
- `@turn_interval_ms`: Configurable via `Application.compile_env`.
- `active_sectors`: Loaded from config in `init/1`.

### 2. `Mutonex.Engine.GameSession` [DONE]
- `@max_speed_ms`: Configurable via `Application.compile_env`.
- `schedule_sector_tick`: Uses `ConfigReader.get/3` with `sector_tick_ms`.
- `handle_info(:tick_sector, s)`:
    - Building maintenance cost (3.0): Configurable.
    - Player energy depletion (0.5): Configurable.
    - Energy min/max (0.0, 100.0).
- `add_player_if_missing`: Uses `ConfigReader.get/3` for `default_spawn_position`.
- `schedule_token_rotation`: Uses `ConfigReader.get/3` with `token_rotation_ms`.

### 3. `Mutonex.Engine.Systems.Environment` [DONE]
- `initial_state`: `game_time` and `sector_energy` are configurable.
- `build`: Terrain size and mineral spawn parameters are configurable.
- `spawn_unit_row`, `spawn_item_row`, `spawn_building_row`:
    - Hardcoded offsets and scale factors moved to `test_layout` config.
- `add_dummies`: Position and attributes remain for dummy test units.

### 4. `Mutonex.Engine.FaunaBehavior` [DONE]
- `spawn`: Position range calculations and charm range.
- `apply_jitter`: Movement range (`jitter_range`).
- `apply_wander`: Movement range (`wander_range`).
- `tick_delay`: Uses `tick_delay_base` and `tick_delay_random`.

### 5. `Mutonex.Engine.Systems.FaunaSystem` [DONE]
- `is_stationary?`: Configurable via `stationary_charm_threshold`.
- `@scales`: Externalized to `config.exs`.
- `accumulate_energy`: Uses `sector_energy` from config.
- `check_spawn`:
    - `spawn_cost_multiplier` and `spawn_initial_energy_multiplier` are configurable.

## Best Practice

For Mutonex, we have adopted the following succinct and pragmatic idiom:

1. **Module Attributes for Defaults**: Use `@attr Application.compile_env(:mutonex_server, [__MODULE__, :key], default)` for compile-time constants.
2. **ConfigReader Utility**: Use `Mutonex.Utils.ConfigReader.get(__MODULE__, :key, default)` for runtime access to application environment configuration. This reduces boilerplate and centralizes configuration access.
3. **Data-Driven Configuration**: Move game rules, scales, and layout parameters to modular files in `gameserver/config/` (e.g., `engine.exs`), documented with technical rationale.

Example of runtime access:
```elixir
defmodule Mutonex.Engine.Example do
  alias Mutonex.Utils.ConfigReader

  def perform do
    interval = ConfigReader.get(__MODULE__, :interval, 5000)
    ...
  end
end
```
