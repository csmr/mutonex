import type {
  PlayerTuple
} from "./MockGameStateProvider.ts";

export interface Sector {
  id: string;
  name: string;
  players_count?: number;
}

export class LobbyView {
  private container: HTMLElement;
  private sectorContainer: HTMLElement;
  private sectorListContainer: HTMLElement;
  private queueContainer: HTMLElement;
  private playerListContainer: HTMLElement;

  private sectors: Sector[] = [];
  private selectedIndex: number = 0;
  private onSelectCallback:
    ((sector: Sector) => void) | null = null;
  private boundInput: (e: KeyboardEvent) => void;
  private isConnected: boolean = false;

  constructor() {
    this.container = document.getElementById(
      "lobby-view"
    )!;
    this.sectorContainer = document.getElementById(
      "sector-selection"
    )!;
    this.sectorListContainer = document.getElementById(
      "sector-list-container"
    )!;
    this.queueContainer = document.getElementById(
      "lobby-queue"
    )!;
    this.playerListContainer = document.getElementById(
      "player-list-container"
    )!;

    if (!this.container) {
      throw new Error("Lobby view container not found");
    }

    this.boundInput =
      this.handleInput.bind(this);
    window.addEventListener(
      "keydown", this.boundInput
    );
  }

  public show(): void {
    this.container.classList.remove("hidden");
  }

  public hide(): void {
    this.container.classList.add("hidden");
  }

  public renderSectorList(sectors: Sector[]): void {
    this.sectors = sectors;
    this.sectorListContainer.innerHTML = "";

    sectors.forEach((sector, index) => {
      const div = document.createElement("div");
      const isSelected = index === this.selectedIndex;
      const baseClass = "list-item";
      div.className = isSelected ?
        `${baseClass} selected` : baseClass;

      let text = sector.name;
      if (sector.players_count !== undefined) {
        text += ` (${sector.players_count})`;
      }
      div.textContent = text;
      div.onclick = () => this.selectSector(index);
      this.sectorListContainer.appendChild(div);
    });
  }

  public updatePlayerQueue(players: PlayerTuple[]): void {
    // Switch view mode if not already
    if (!this.isConnected) {
      this.isConnected = true;
      this.sectorContainer.style.display = "none";
      this.queueContainer.style.display = "block";
    }

    this.playerListContainer.innerHTML = "";
    players.forEach((player) => {
      // player is [id, x, y, z]
      const id = player[0];
      const div = document.createElement("div");
      // Re-use list-item style for consistency
      div.className = "list-item";
      div.style.cursor = "default";
      div.textContent = `Player ${id}`;
      this.playerListContainer.appendChild(div);
    });
  }

  public onSectorSelect(
    callback: (sector: Sector) => void
  ): void {
    this.onSelectCallback = callback;
  }

  private selectSector(index: number): void {
    if (index < 0 || index >= this.sectors.length) return;
    this.selectedIndex = index;
    // Re-render to update selection style
    this.renderSectorList(this.sectors);

    // If "Enter" or Click
    if (this.onSelectCallback) {
      const selected = this.sectors[this.selectedIndex];
      this.onSelectCallback(selected);
    }
  }

  private handleInput(e: KeyboardEvent): void {
    const isHidden = this.container.classList.contains(
      "hidden"
    );
    if (isHidden) return;
    // Disable sector selection when in queue
    if (this.isConnected) return;

    if (e.key === "ArrowUp") {
      const len = this.sectors.length;
      this.selectedIndex = (this.selectedIndex - 1 + len) %
        len;
      this.renderSectorList(this.sectors);
    } else if (e.key === "ArrowDown") {
      const len = this.sectors.length;
      this.selectedIndex = (this.selectedIndex + 1) % len;
      this.renderSectorList(this.sectors);
    } else if (e.key === "Enter") {
      this.selectSector(this.selectedIndex);
    }
  }
}
