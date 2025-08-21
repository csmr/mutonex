# Mutonex Game Rules & Design

This document provides a summary of the core gameplay rules, entities, and design principles for Mutonex, based on the main Design Document.

## 1. Game Synopsis

Mutonex is a multiplayer strategy game on a simulated Earth, featuring simple, chess-like mechanics with a focus on social tactics. Game sessions are short (12 minutes), turn-based, and divided into three phases: Exploration, Building, and Interaction. The planet's state is persistent, with relics from past games affecting future ones.

## 2. Game Rules & Flow

### 2.1. Session Structure
- **Lobby Time:** 3 minutes
- **Game Time:** 12 minutes
- **Turn Length:** 30 seconds
- **Total Turns (approx):** 24 turns

### 2.2. Game Phases
The game flows through three distinct phases:
1.  **Exploration:** Players explore the terrain, encounter local societies, and charm follower units.
2.  **Building:** Players command followers to build a home realm and establish a power structure, which is key to projecting power.
3.  **Interaction:** Players use their power projection to form alliances, charm more units, and compete with others.

### 2.3. Victory
- A winner is determined by victory rules or when the time limit is reached.
- At the end of a session, scores are calculated, and certain game elements (like buildings and unit histories) are saved as persistent "relics".

## 3. Core Game Entities & Properties

### Exoplanet Simulation
- A simulated Earth that provides the terrain, resources, and environmental effects (weather, insolation) for the game board. The planet's state is persistent across game sessions.

### Sector
- A 10x10 degree subdivision of the game board.
- **Properties:** Coordinates, weather, insolation, mineral resources, and native fauna. These properties affect gameplay within the sector.

### Building
- Stationary structures built by societies.
- **Properties:** Position, sight area, a specific function (e.g., resource conversion), and a "Chief" unit.
- **Persistence:** Building history (build year, style) is saved as a relic.

### Society
- A player-controlled or NPC faction.
- **Properties:** A home base (a building), and an ethnicity (e.g., French).

### Fauna
- Native, non-player lifeforms tied to a specific sector. They cannot be charmed but affect gameplay.

### Mineral
- A harvestable resource node at a specific position.
- **Properties:** Position and type (e.g., Iron).

### Unit
- A mobile entity belonging to a society, born in a building.
- **Actions:** Can be charmed, build, harvest, wander, or attack based on society policy.
- **Types:**
  - **Head:** The player's main character. Can charm units, initiate building, and set policy.
  - **Chief:** The leader of an NPC society.
  - **Follower:** A standard unit.
- **Properties:** Position, sight area, home, society, and attributes like `charm`, `tribe`, and `flavor`.
- **Persistence:** Unit history can be saved as part of a relic.

---
**Note:** Each section from this document should eventually be merged into `ruleset/rule-calculator.rb` so that there is output for each calculation.
