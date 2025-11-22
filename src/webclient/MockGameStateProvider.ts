// Defines the structure of the game state data.
export interface Position {
  x: number;
  y: number;
  z: number;
}

export interface Unit {
  id: string;
  type: string; // "head" | "chief" | "follower"
  position: Position;
  society_id: string;
}

export interface Building {
  id: string;
  type: string; // "power_structure" | "relic"
  position: Position;
  society_id: string;
}

export interface Society {
  id: string;
  player_id: string;
}

export interface Mineral {
  id: string;
  type: string; // "iron" | "potassium"
  position: Position;
}

export interface GameState {
  game_time: number;
  units: Unit[];
  buildings: Building[];
  societies: Society[];
  minerals: Mineral[];
}

type UpdateCallback = (gameState: GameState) => void;

/**
 * Simulates a game server by generating and emitting game state updates.
 */
export class MockGameStateProvider {
    private gameState: GameState;
    private onUpdate: UpdateCallback;
    private intervalId: number | null = null;

    constructor(onUpdate: UpdateCallback) {
        this.onUpdate = onUpdate;
        this.gameState = this.#generateInitialState();
    }

    public start(updateInterval = 2000): void {
        if (this.intervalId) return; // Already running

        // Emit the initial state immediately
        this.onUpdate(this.gameState);

        this.intervalId = setInterval(() => {
            this.#updateGameState();
            this.onUpdate(this.gameState);
        }, updateInterval);
    }

    public stop(): void {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }

    #generateInitialState(): GameState {
        const state: GameState = {
            gameTime: 720, // 12 minutes
            resources: {
                'Player1': { energy: 1000, materials: 500 },
                'Player2': { energy: 1000, materials: 500 },
            },
            units: [
                { id: 'u1', owner: 'Player1', lat: 40.7128, lon: -74.0060 }, // New York
                { id: 'u2', owner: 'Player2', lat: 34.0522, lon: -118.2437 }, // Los Angeles
            ],
            sectors: {},
        };

        // Create some initial owned sectors
        state.sectors['lat_40_lon_-70'] = { id: 'lat_40_lon_-70', owner: 'Player1' };
        state.sectors['lat_30_lon_-120'] = { id: 'lat_30_lon_-120', owner: 'Player2' };
        state.sectors['lat_50_lon_0'] = { id: 'lat_50_lon_0', owner: 'Player1' };

        return state;
    }

    #updateGameState(): void {
        // Decrement game time
        this.gameState.gameTime -= 2;
        if (this.gameState.gameTime < 0) this.gameState.gameTime = 720;

        // Fluctuate resources
        this.gameState.resources['Player1'].energy += Math.floor(Math.random() * 10) - 4;

        // Simulate a unit moving
        const unitToMove = this.gameState.units[0];
        unitToMove.lon += 1.5;
        if (unitToMove.lon > 180) unitToMove.lon = -180;

        // Simulate a sector changing hands
        const sectorIds = Object.keys(this.gameState.sectors);
        if (sectorIds.length > 0) {
            const randomSectorId = sectorIds[Math.floor(Math.random() * sectorIds.length)];
            const currentOwner = this.gameState.sectors[randomSectorId].owner;
            this.gameState.sectors[randomSectorId].owner = currentOwner === 'Player1' ? 'Player2' : 'Player1';
        }
    }
}
