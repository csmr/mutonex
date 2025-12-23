# Feature Cards Implementation Analysis

This document analyzes the implementation of Feature Cards from the Game Design Document (GDD) in the codebase.

## 1. Entities

Entities are the core interactive objects in the game world. They are implemented as Elixir structs in `Mutonex.Engine.Entities`.

*   **Unit**: Implemented as `Mutonex.Engine.Entities.Unit`. Covers `Head`, `Chief`, `Follower`.
    *   *Status*: Stubbed. Needs expansion for specific behavior logic (movement speed, sight radius) which varies by type.
    *   *Charmable*: Default `true`. Can be set to `false` for specific types (e.g., Heads, if implied).
*   **Building**: Implemented as `Mutonex.Engine.Entities.Building`. Covers `Power Structure` and generic buildings.
    *   *Status*: Stubbed. Needs implementation of `function` logic (resource conversion, sight generation).
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
*   **Exoplanet Sim**: Implemented in `src/simtellus` (Ruby). Provides data for terrain and environment.
*   **Faction**: A composite concept used to determine unit/building alignment and flavor.
    *   **Society**: The group identity (e.g., "Finnish", "Fauna Local").
    *   **Element**: Elemental affinity (e.g., "Helium", "Iron").
    *   **Flavor**: Visual identity (e.g., "Navy", "Maroon").

## 4. Implementation Plan for Remaining Features

1.  **Unit differentiation**: Expand `Unit` struct or logic to handle `Activist` (attack) vs `Local` (work) behavior.
2.  **Building Mechanics**: Implement `Power Structure` logic (LIDAR connection) in `GameSession`.
3.  **Action System**: Create a system to handle actions like `charm`, `build`, `attack` triggered by clients, checking `is_charmable` flags.
