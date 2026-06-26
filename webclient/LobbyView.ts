import type { PlayerTuple } from "./MockGameStateProvider.ts";

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
  private isConnected: boolean = false;

  constructor() {
    this.container = document.getElementById(
      "lobby-view",
    )!;
    this.sectorContainer = document.getElementById(
      "sector-selection",
    )!;
    this.sectorListContainer =
      document.getElementById(
        "sector-list-container",
      )!;
    this.queueContainer = document.getElementById(
      "lobby-queue",
    )!;
    this.playerListContainer =
      document.getElementById(
        "player-list-container",
      )!;

    if (!this.container) {
      throw new Error(
        "Lobby view container not found",
      );
    }
  }

  public show(): void {
    this.container.classList.remove("hidden");
  }

  public hide(): void {
    this.container.classList.add("hidden");
  }

  public renderSectorList(sectors: Sector[]): void {
    this.sectors = sectors;
    this.sectorListContainer.textContent = "";

    sectors.forEach((sector, index) => {
      const div = document.createElement("div");
      const isSelected = index === this.selectedIndex;
      const baseClass = "list-item";
      div.className = isSelected ? `${baseClass} selected` : baseClass;

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
    if (!this.isConnected) {
      this.isConnected = true;
      this.sectorContainer.style.display = "none";
      this.queueContainer.style.display = "block";
    }

    this.playerListContainer.textContent = "";
    players.forEach((player) => {
      const id = player[0];
      const div = document.createElement("div");
      div.className = "list-item";
      div.style.cursor = "default";
      div.textContent = `Player ${id}`;
      this.playerListContainer.appendChild(div);
    });
  }

  public onSectorSelect(
    callback: (sector: Sector) => void,
  ): void {
    this.onSelectCallback = callback;
  }

  public navigate(delta: number): void {
    if (this.isConnected) return;
    const len = this.sectors.length;
    if (len === 0) return;
    this.selectedIndex =
      (this.selectedIndex + delta + len) % len;
    this.renderSectorList(this.sectors);
  }

  public confirmSelection(): void {
    if (this.isConnected) return;
    this.selectSector(this.selectedIndex);
  }

  private selectSector(index: number): void {
    const len = this.sectors.length;
    if (index < 0 || index >= len) return;
    this.selectedIndex = index;
    this.renderSectorList(this.sectors);

    if (this.onSelectCallback) {
      const selected =
        this.sectors[this.selectedIndex];
      this.onSelectCallback(selected);
    }
  }
}
