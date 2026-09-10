# Feature Cards Implementation Analysis

This document analyzes the implementation of Feature Cards from the Game Design Document (GDD) in the codebase.

## 1. Entities

Entities are the core interactive objects in the game world. They are implemented as Elixir structs in `Mutonex.Engine.Entities`.

*   **Unit**: Implemented as `Mutonex.Engine.Entities.Unit`. Covers `Head`, `Chief`, `Follower`.
    *   *Status*: Stubbed. Needs expansion for specific behavior logic (movement speed, sight radius) which varies by type.
    *   *Charmable*: Default `true`. Can be set to `false` for specific types (e.g., Heads, if implied).
*   **Building**: Implemented as `Mutonex.Engine.Entities.Building`. Covers `Power Structure` and generic buildings.
    *   *Status*: Partial (In Progress). Gameserver supports
        `install_lidar` modifier items, perimeter spacing, and
        relic persistence. Requires webclient 3D entity rendering
        and full building verb functions.
*   **Society**: Implemented as `Mutonex.Engine.Entities.Society`.
    *   *Status*: Stubbed. Represents the social group or faction. Replaces the "ethnicity" concept with a `locale` property derived from `regions.yaml`.
*   **Fauna**: Implemented as `Mutonex.Engine.Entities.Fauna`.
    *   *Status*: Implemented with basic random movement in `GameSession`.
    *   *Note*: Possesses `charm` property (offensive potential), but is **immune to being charmed** (`is_charmable: false`).
    *   *Faction*: "Fauna-ethnicity" is implemented as the `Society` of the Fauna.
*   **Mineral**: Implemented as `Mutonex.Engine.Entities.Mineral`.
    *   *Status*: Stubbed.

## 2. Modifiers (Object Cards)

Modifiers are items or buffs that units/buildings possess. They are not distinct entities but rather attributes or state modifiers.

*   **Charm**:
    *   *Type*: Action (Verb) and Property (Quantity).
    *   *Description*: All units (including Fauna) possess a `charm` quantity. The `charm` action uses this quantity in a trial against a target's resistance.
    *   *Immunity*: Fauna entities cannot be targeted by the `charm` action.
    *   *Implementation*: `charm` field in Entity structs (`Unit`, `Fauna`, `Building`). `is_charmable` boolean flag determines targetability.
*   **Build**: Likely an attribute enabling the `build` action.
*   **LIDAR**:
    *   *Type*: Item / Buff (Transferable).
    *   *Description*: Can be possessed by both Units and Buildings. A Unit can carry LIDAR and transfer it to another Unit or a Power Structure. When installed in a Power Structure, it enables/enhances `lidar-sight` for that building.
    *   *Implementation*: Inventory item or transferable attribute. `Mutonex.Engine.Lidar` handles the logic.
*   **Video-phone**: An item/tech that enables the `meeting` action.
*   **Sunspot Cream**: An item that mitigates entropy effects.

## 3. Concepts

*   **Game Session**: Implemented as `Mutonex.Engine.GameSession` (GenServer). Manages the state of a sector.
*   **Sector**: Currently represented by `sector_id` and `Terrain` struct.
*   **Exoplanet Sim**: Implemented in `gameserver/lib/simtellus/` (Elixir, ported from Ruby). Provides data for terrain and environment.
*   **Faction**: A composite concept used to determine unit/building alignment and flavor.
    *   **Society**: The group identity (e.g., "Finnish", "Fauna Local").
    *   **Element**: Elemental affinity (e.g., "Helium", "Iron").
    *   **Flavor**: Visual identity (e.g., "Navy", "Maroon").

## 4. Implementation Plan for Remaining Features

### A. Active TODOs
1.  **Webclient 3D Building Entities**: Implement webclient 3D
    entity rendering for in-game buildings (`Power Structure`,
    `Tent`, `Houses`, `Cityscape`, `Moyai`, `Solar Panel`) in
    `webclient/render/EntityRenderer.ts` and
    `webclient/core/GameStateManager.ts`.
2.  **Building Verbs & Functions**: Implement engine verbs
    (`build_powerstructure`, `build_conveyor`, `build_fiber`),
    power projection sight radius, and resource conversion in
    `Mutonex.Engine.Actions`.
3.  **Action System**: Create a system to handle actions like
    `charm`, `build`, `attack` triggered by clients, checking
    `is_charmable` flags.

### B. Completed & Archived Items
1.  **Unit Differentiation**: Expand `Unit` struct or logic to
    handle `Activist` (attack) vs `Local` (work) behavior.
    Fauna and Octree integration is finalized.
2.  **Building Modifiers & Persistence**: `install_lidar` modifier
    item attachment, 2km spatial perimeter checks, and relic
    persistence (manifesting persistent relics as dormant unowned
    NPC-buildings ready to be charmed) are complete in the engine.
