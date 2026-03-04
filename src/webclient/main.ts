// Declare THREE as a global variable
import "./global_types.ts";

import { GameStateProvider } from "./GameStateProvider.ts";
import { ViewManager } from "./ViewManager.ts";
import { LidarView } from "./LidarView.ts";
import { LidarStyles } from "./LidarStyles.ts";
import { SphereView } from "./SphereView.ts";
import { LobbyView, Sector } from "./LobbyView.ts";
import { AvatarController } from "./AvatarController.ts";
import { EntityData, Terrain } from "./types.ts";
import type { PlayerTuple } from "./MockGameStateProvider.ts";

// Main application logic
function main() {
  const canvas = document.getElementById(
    "main-canvas",
  ) as HTMLCanvasElement;
  if (!canvas) {
    console.error("Main canvas not found");
    return;
  }

  // --- View Manager Setup ---
  const viewManager = new ViewManager(canvas);

  // --- Views ---
  const lidarView = new LidarView(canvas);
  const sphereView = new SphereView(canvas);

  viewManager.setActiveView(lidarView);

  // Debug handle
  window.__mutonex = {
    lidarView,
    viewManager,
    renderer: (viewManager as any).renderer,
  };

  (window.__mutonex.lidarView as any).setStyle = (styleName: string) => {
    if (LidarStyles[styleName]) {
      lidarView.setLidarStyle(styleName);
    }
  };

  // Start the render loop
  viewManager.animate();

  // --- Lobby Setup ---
  const lobbyView = new LobbyView();

  const mockSectors: Sector[] = [
    { id: "game:lobby", name: "Sector Alpha (Dev)" },
    { id: "game:lobby_beta", name: "Sector Beta (Test)" },
    { id: "game:lobby_gamma", name: "Sector Gamma (High Pop)" },
  ];
  lobbyView.renderSectorList(mockSectors);

  // --- Game State Variables ---
  let gameStateProvider: GameStateProvider | null = null;
  const entities: EntityData[] = [];
  const playerAnchors: Map<string, any> = new Map();
  const faunaAnchors: Map<string, any> = new Map();
  const faunaTargets: Map<string, any> = new Map();

  const avatar = new AvatarController(
    viewManager,
    () => gameStateProvider,
  );

  let currentTerrain: Terrain | null = null;

  const updateEntitiesList = (
    interpolatedPositions?: Map<string, any>,
  ) => {
    entities.length = 0;

    for (const [id, pos] of playerAnchors) {
      entities.push({
        id, type: "player", pos: pos.clone(), char: "", isStationary: false, facing: "front"
      });
    }

    for (const [id, anchorPos] of faunaAnchors) {
      const pos = interpolatedPositions?.get(id) || anchorPos;
      entities.push({
        id, type: "fauna", pos: pos.clone(), char: "", isStationary: false, facing: "side"
      });
    }

    const activeView = viewManager.getActiveView();
    if (activeView) activeView.updateEntities(entities);
  };

  const onInitialState = (gameState: any) => {
    if (gameState.terrain) {
      currentTerrain = gameState.terrain;
      lidarView.updateTerrain(currentTerrain!);
      sphereView.updateTerrain(currentTerrain!);
    }

    if (gameStateProvider?.phase === "lobby") {
      lobbyView.show();
      if (gameState.players) {
        lobbyView.updatePlayerQueue(gameState.players);
      }
    } else {
      lobbyView.hide();
      if (gameState.players) updatePlayerAnchors(gameState.players);
    }

    if (gameState.fauna) updateFaunaAnchors(gameState.fauna);
    updateEntitiesList();
  };

  const onStateUpdate = (update: any) => {
    if (gameStateProvider?.phase === "lobby") {
      lobbyView.show();
      if (update.players) lobbyView.updatePlayerQueue(update.players);
    } else {
      lobbyView.hide();
      if (update.players) updatePlayerAnchors(update.players);
    }
    if (update.fauna) updateFaunaAnchors(update.fauna);
  };

  const joinSector = (sector: Sector) => {
    if (gameStateProvider) return;

    gameStateProvider = new GameStateProvider(
      sector.id,
      onInitialState,
      onStateUpdate,
    );
    gameStateProvider.start();
    startUpdateLoop();
  };

  lobbyView.onSectorSelect(joinSector);
  lobbyView.show();

  const params = new URLSearchParams(window.location.search);
  if (params.get("join") !== "false") {
    setTimeout(() => joinSector(mockSectors[0]), 2000);
  }

  // --- Loop ---
  function startUpdateLoop() {
    const FAUNA_SPEED = 0.5;
    let lastTime = performance.now();

    window.addEventListener("keydown", (e) => {
      if (e.key === "Tab") {
        e.preventDefault();
        const current = viewManager.getActiveView();
        const next = current === lidarView ? sphereView : lidarView;
        viewManager.setActiveView(next);
        if (currentTerrain) next.updateTerrain(currentTerrain);
        updateEntitiesList();
      }

      if (e.key.toLowerCase() === "l") {
        const styles = Object.keys(LidarStyles);
        const currentIndex = styles.indexOf(lidarView.currentStyleName);
        const nextIndex = (currentIndex + 1) % styles.length;
        lidarView.setLidarStyle(styles[nextIndex]);
      }

      if (e.key === "[") lidarView.entropy = Math.max(0, lidarView.entropy - 0.1);
      if (e.key === "]") lidarView.entropy = Math.min(1, lidarView.entropy + 0.1);
    });

    function updateLoop() {
      requestAnimationFrame(updateLoop);
      if (gameStateProvider?.phase === "lobby") return;

      const now = performance.now();
      const delta = (now - lastTime) / 1000;
      lastTime = now;

      const currentInterp = new Map<string, any>();
      for (const [id, anchor] of faunaAnchors) {
        let target = faunaTargets.get(id);
        if (!target) {
          target = anchor.clone();
          faunaTargets.set(id, target);
        }

        const dist = target.distanceTo(anchor);
        if (dist > 5.0) {
          const dir = new THREE.Vector3()
            .subVectors(anchor, target)
            .normalize();
          target.add(dir.multiplyScalar(FAUNA_SPEED * delta));
        } else {
          target.x += (Math.random() - 0.5) * FAUNA_SPEED * delta * 2;
          target.z += (Math.random() - 0.5) * FAUNA_SPEED * delta * 2;
        }
        currentInterp.set(id, target);
      }

      avatar.update(delta);
      updateEntitiesList(currentInterp);
    }
    updateLoop();
  }

  function updatePlayerAnchors(players: PlayerTuple[]) {
    for (const [id, x, y, z] of players) {
      playerAnchors.set(id, new THREE.Vector3(x, 1, z));
    }
  }

  function updateFaunaAnchors(fauna: PlayerTuple[]) {
    for (const [id, x, y, z] of fauna) {
      faunaAnchors.set(id, new THREE.Vector3(x, 1, z));
    }
  }
}

window.addEventListener("DOMContentLoaded", main);
