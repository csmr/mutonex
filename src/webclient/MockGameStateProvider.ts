// Defines the structure of the game state
// data transported from the server.

import { Terrain } from "./types.ts";
export type { Terrain };

// Represents a player as a tuple:
// [id, x, y, z]
export type PlayerTuple = [
  string, number, number, number
];

export interface GameState {
  game_time: number;
  players: PlayerTuple[];
  terrain: Terrain;
}
