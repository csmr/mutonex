# NPC Indoctrination & Pseudoidentities

## Overview
Indoctrination represents the effect of ideology and 'isms' on
individual NPCs. Unlike charming (which is a direct psychic/social
link) or following a chief (which is tribal loyalty),
indoctrination is a mental state where narratives shape a
pseudoidentity. The weak are hypnotized into adopting an
identity they do not truly belong to.

## Core Logic (Ultra-Simple)
To keep the implementation pragmatic and succinct, we will use
the following logic:

### 1. Data Structure Update
- Add an optional `indoctrination` field to the `Unit` struct
  in `Mutonex.Engine.Entities`.
- This field stores a `pseudo_society_id` (representing the
  adopted ideology).

### 2. Behavioral Shifts
Modify `Mutonex.Engine.NpcBehavior` to check for indoctrination:
- **Faction Counter-Action:** NPCs may occasionally act in the
  interest of their `pseudo_society_id` instead of their
  actual `society_id`.
- **The "Failboat" Mechanic:** Indoctrinated NPCs have a small
  chance (e.g., 5-10%) to erratically fail their intended
  action (e.g., trying to "Work" but just spinning in place).
- **Hallucination Exclamations:** When failing or acting
  counter-faction, the NPC will emit a text exclamation
  (e.g., "The Neon Singularity demands my silence!",
  "I am but a ghost in the ethnic shell!").

### 3. Visibility
Players see the indoctrination through:
- Unexpected movement/actions (the NPC wandering toward
  an enemy base peacefully).
- Floating text bubbles containing indoctrinated
  hallucinations.
- A visual "glitch" or aura (to be defined in the
  rendering pipeline).

## Vehicle of Indoctrination
- **Item:** `The Identity Refractor`
- **Effect:** When used near an NPC, it has a chance to
  override their current identity with a pre-programmed
  narrative.
- **Status:** [ ] To be implemented.

---
"The mind is a soft clay, and ideology is the heavy boot that
stamps it into the shape of a god it never knew."
- *Vaxen Krol, 'The Silicon Gospel'*
