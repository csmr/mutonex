import { Socket } from "./deps.ts";
import type { GameState } from "./MockGameStateProvider.ts";

const PHOENIX_URL = "ws://localhost:4000/socket";

type UpdateCallback = (gameState: GameState) => void;

export class GameStateProvider {
  private socket: Socket;
  private channel: any;
  private onUpdate: UpdateCallback;

  constructor(onUpdate: UpdateCallback) {
    this.onUpdate = onUpdate;
    // Phoenix from <script>-tag 
    this.socket = new Phoenix.Socket(PHOENIX_URL);
  }

  public start(): void {
    this.socket.connect();
    console.log("Phoenix.Socket connected? --> ", this.socket.isConnected());

    this.channel = this.socket.channel("game:lobby", {});
    this.channel.join()
      .receive("ok", (resp: any) => {
        console.log("Joined channel successfully", resp);
        // Request initial game state
        this.requestNewGameState();
      })
      .receive("error", (resp: any) => { console.log("Unable to join channel", resp); });

    this.channel.on("game_state", (payload: GameState) => {
      this.onUpdate(payload);
    });
  }

  public stop(): void {
    this.channel.leave();
    this.socket.disconnect();
  }

  public requestNewGameState(): void {
    this.channel.push("get_game_state", {});
  }
}
