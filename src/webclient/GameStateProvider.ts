import type { GameState, PlayerTuple } from "./MockGameStateProvider.ts";

type InitialStateCallback = (gameState: GameState) => void;
type StateUpdateCallback = (
  update: { players?: PlayerTuple[]; fauna?: PlayerTuple[] },
) => void;

export class GameStateProvider {
  private socket: any;
  private channel: any;
  private onInitialState: InitialStateCallback;
  private onStateUpdate: StateUpdateCallback;
  private sectorId: string;
  public phase: string = "lobby";
  public playerId: string | null = null;
  private tempToken: string | null = null;

  constructor(
    sectorId: string,
    onInitialState: InitialStateCallback,
    onStateUpdate: StateUpdateCallback,
  ) {
    this.sectorId = sectorId;
    this.onInitialState = onInitialState;
    this.onStateUpdate = onStateUpdate;

    const loc = window.location;
    const isHttps = loc.protocol === "https:";
    const protocol = isHttps ? "wss:" : "ws:";
    const host = loc.host || "localhost:4000";
    const url = `${protocol}//${host}/socket`;

    // Phoenix is globally available
    const Phoenix = (window as any).Phoenix;
    this.socket = new Phoenix.Socket(url);
  }

  public start(): void {
    this.socket.connect();

    this.channel = this.socket.channel(this.sectorId, {});
    this.channel
      .join()
      .receive("ok", () => {
        console.log("Joined channel successfully");
      })
      .receive("error", (resp: any) => {
        console.log("Unable to join channel", resp);
      });

    this.channel.on("game_phase", (payload: any) => {
      console.log("Game Phase:", payload.phase);
      this.phase = payload.phase;
      if (payload.user_id) {
        this.playerId = payload.user_id;
      }
    });

    this.channel.on("new_token", (payload: { token: string }) => {
      console.log("Received new session message token");
      this.tempToken = payload.token;
    });

    this.channel.on("game_state", (payload: GameState) => {
      console.log("Received initial game state:", payload);
      this.onInitialState(payload);
    });

    this.channel.on("state_update", (payload: any) => {
      this.onStateUpdate(payload);
    });

    this.channel.on("fauna_update", (payload: any) => {
      this.onStateUpdate(payload);
    });
  }

  public stop(): void {
    if (this.channel) this.channel.leave();
    if (this.socket) this.socket.disconnect();
  }

  public sendAvatarPosition(
    position: [number, number, number],
  ): void {
    const message = {
      session_message_token: this.tempToken,
      payload: position,
    };
    this.channel.push("avatar_update", message);
  }
}
