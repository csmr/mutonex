import type { GameState, Player } from "./MockGameStateProvider.ts";

const PHOENIX_URL = "ws://localhost:4000/socket";

type InitialStateCallback = (gameState: GameState) => void;
type StateUpdateCallback = (update: { players: Player[] }) => void;

export class GameStateProvider {
  private socket: Socket;
  private channel: any;
  private onInitialState: InitialStateCallback;
  private onStateUpdate: StateUpdateCallback;
  public phase: string = "lobby";

  constructor(onInitialState: InitialStateCallback, onStateUpdate: StateUpdateCallback) {
    this.onInitialState = onInitialState;
    this.onStateUpdate = onStateUpdate;
    // Phoenix is globally available from a <script> tag in mutonex.html
    this.socket = new (window as any).Phoenix.Socket(PHOENIX_URL);
  }

  public start(): void {
    this.socket.connect();

    this.channel = this.socket.channel("game:lobby", {});
    this.channel.join()
      .receive("ok", () => {
        console.log("Joined channel successfully");
      })
      .receive("error", (resp: any) => { console.log("Unable to join channel", resp); });

    // Handle game phase transitions
    this.channel.on("game_phase", (payload: { phase: string }) => {
      console.log("Game Phase:", payload.phase);
      this.phase = payload.phase;
    });

    // This event is now pushed by the server automatically upon join
    this.channel.on("game_state", (payload: GameState) => {
      console.log("Received initial game state:", payload);
      this.onInitialState(payload);
    });

    // This event is broadcast by the server when any player moves
    this.channel.on("state_update", (payload: { players: Player[] }) => {
      this.onStateUpdate(payload);
    });
  }

  public stop(): void {
    if (this.channel) this.channel.leave();
    if (this.socket) this.socket.disconnect();
  }

  public sendAvatarPosition(position: [number, number, number]): void {
    this.channel.push("avatar_update", position);
  }
}
