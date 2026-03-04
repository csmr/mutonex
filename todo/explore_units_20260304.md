# Mutonex Unit Exploration (Unifont Glyphs)

This document tracks potential Unicode glyph sections to evaluate for visually defining new Mutonex entities (stationary landscape, new units, resources, etc.) using the existing GNU Unifont pipeline.

## Exploration Targets

### 1. Flora & Environment (Stationary Objects)
- **Trees / Plants**: `U+1F330` - `U+1F343` (Chestnut, Seedling, Evergreen Tree, Deciduous Tree, Palm Tree, Cactus)
- **Landscapes / Weather**: `U+1F324` - `U+1F32B` (Cloud, Sun behind Cloud, Fog)
- **Natural Formations**: `U+1F30B` (Volcano), `U+1F3D4` (Snow Capped Mountain)

### 2. Fauna (Moving Entities)
- **Insects / Bugs**: `U+1F41B` - `U+1F41D` (Bug, Ant, Honeybee) -> Extend `isStationary: false`, `facing: "top" | "side"`
- **Mammals / Herds**: `U+1F400` - `U+1F412` (Rat, Mouse, Ox, Water Buffalo, Cow, Pig, Ram, Sheep)
- **Birds**: `U+1F426`, `U+1F985` (Bird, Eagle) -> For flying units.

### 3. Buildings & Infrastructure (Stationary Objects)
- **Civilization Structures**: `U+1F3E0` - `U+1F3ED` (House, Office Building, Post Office, Hospital, Bank, Factory, Castle)
- **Monuments / Culture**: `U+1F5FC` (Tokyo Tower), `U+1F5FD` (Statue of Liberty), `U+1F5FE` (Map of Japan), `U+1F5FF` (Moyai) -> Good candidates for Relics.
- **Logistics**: `U+1F6E4` (Railway Track), `U+1F6A6` (Vertical Traffic Light) -> Could represent conveyors / routing nodes.

### 4. Units & Societies (Moving Entities)
- **Roles**: `U+1F468`, `U+26D1` (Man, Rescue Worker), `U+1F9D9` (Mage) -> Existing Player Head types.
- **Vehicles / Logistics**: `U+1F69C` (Tractor), `U+1F69A` (Delivery Truck) -> Abstract transport units.
- **Drones / Tech**: `U+1F6F8` (Flying Saucer), `U+1F916` (Robot Face) -> Automated workers.

### 5. Minerals & Resources (Stationary Nodes)
- **Metals / Gems**: `U+1F48E` (Gem Stone), `U+26CF` (Pick), `U+26E8` (Black Cross on Shield)
- **Energy / Abstract Blocks**: Geometric shapes block `U+25A0` - `U+25FF` (Black Square, White Circle, Diamonds) -> Useful for raw ore nodes.

## Implementation Notes
- Add the targeted character to the `EntityRenderer.ts` `charMap` and assign a `EntityType`.
- Ensure the scale mapping works visually against the baseline 2.0x standard.
- Register whether the imported icon is natively a `"front"` profile or `"side"` profile inside the entity pipeline to automatically apply the standard `-Math.PI / 2` anterior correction.
