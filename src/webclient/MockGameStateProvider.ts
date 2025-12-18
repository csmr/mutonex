// Defines the structure of the game state data transported from the server.

// Represents a player as a tuple: [id, x, y, z]
export type PlayerTuple = [string, number, number, number];

export interface Terrain {
  type: "heightmap";
  size: {
    width: number;
    height: number;
  };
  data: number[][];
}

export interface GameState {
  game_time: number;
  players: PlayerTuple[];
  terrain: Terrain;
}
