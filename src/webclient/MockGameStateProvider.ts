// Defines the structure of the game state
// data transported from the server.

import { Terrain } from "./types.ts";
export type { Terrain };

// [id, x, y, z, charm]
export type PlayerTuple = [
  string,
  number,
  number,
  number,
  number?,
];

export interface GameState {
  game_time: number;
  players: PlayerTuple[];
  fauna: PlayerTuple[];
  minerals: any[];
  terrain: Terrain;
}
