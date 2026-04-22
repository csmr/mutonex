# Gameplay Todo: Item Pick-up & Inventory Mechanic

## Objective
Implement a mechanism for Units (primarily the player's Head unit) to interact with 'Item' entities in the scene, picking them up into an inventory.

## Technical Plan

### 1. Data Model (`src/gameserver/lib/engine/entities.ex`)
- [ ] Define `Mutonex.Engine.Entities.Item` struct:
    ```elixir
    defmodule Item do
      defstruct id: nil, type: nil, position: %{x: 0, y: 0, z: 0}, metadata: %{}
    end
    ```
- [ ] Add `inventory: []` field to `Mutonex.Engine.Entities.Unit`.
- [ ] Add `items: []` to `GameState` for world-level tracking.

### 2. Backend Logic (`src/gameserver/lib/engine/game_session.ex`)
- [ ] Create action handler for `pick_up`:
    - Use `SparseOctree.query_range` to find items near the actor.
    - Validate proximity (e.g., < 15km).
    - Use `SparseOctree.remove` to excise the item from the world.
    - Update `Unit` state by appending to `inventory`.

### 3. Client Interaction (`src/webclient/main.ts` & `ActionHUD.ts`)
- [ ] **Scene Click**: Implement raycasting or identifier matching in `LidarView` or `ViewManager` to detect when a user clicks an entity of type `item_default`.
- [ ] **HUD State**: When an item is targeted and within range, display a "PICK UP" card in the `ActionHUD`.
- [ ] **Message**: Use `gameStateProvider.sendPlayerAction("pick_up", target_id)` to trigger the server sync.

### 4. Doctrine Alignment (`AGENTS.md`)
- Ensure handlers are decoupled and succinct (<11 lines per block).
- Implement a standalone test in `src/gameserver/test/mutonex_engine/inventory_test.exs` to verify transfer without a full network stack.
