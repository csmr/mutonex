// Declare THREE as a global variable
import "./global_types.ts";

import { GameStateProvider } from "./GameStateProvider.ts";
import { ViewManager } from "./ViewManager.ts";
import { LidarView } from "./LidarView.ts";
import { SphereView } from "./SphereView.ts";
import { LobbyView, Sector } from "./LobbyView.ts";
import { EntityData, Terrain } from "./types.ts";
import type {
  PlayerTuple
} from "./MockGameStateProvider.ts";

// Main application logic
function main() {
  const canvas = document.getElementById(
    "main-canvas"
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

  // Debug handle — deterministic console access with no guessing.
  // Usage: window.__mutonex.lidarView.lidarMaterial.uniforms.diagMode.value = 1.0
  // Usage: window.__mutonex.renderer for readRenderTargetPixels probing
  window.__mutonex = { lidarView, viewManager, renderer: (viewManager as any).renderer };

  // Start the render loop
  viewManager.animate();

  // --- Lobby Setup ---
  const lobbyView = new LobbyView();

  const mockSectors: Sector[] = [
    { id: "game:lobby", name: "Sector Alpha (Dev)" },
    { id: "game:lobby_beta", name: "Sector Beta (Test)" },
    {
      id: "game:lobby_gamma",
      name: "Sector Gamma (High Pop)"
    }
  ];
  lobbyView.renderSectorList(mockSectors);

  // --- Game State Variables ---
  let gameStateProvider: GameStateProvider | null = null;
  const entities: EntityData[] = [];
  const playerAnchors: Map<string, any> = new Map();
  const faunaAnchors: Map<string, any> = new Map();
  const faunaTargets: Map<string, any> = new Map();

  const localPlayerPos = new THREE.Vector3(10, 0, 10);
  let lastSentPosition = localPlayerPos.clone();
  let currentTerrain: Terrain | null = null;
  let lidarMode: "vertical" | "horizontal" = "vertical";

  const updateEntitiesList = (
    interpolatedPositions?: Map<string, any>
  ) => {
    entities.length = 0;

    for (const [id, pos] of playerAnchors) {
      entities.push({
        id,
        type: "player",
        pos: pos.clone(),
        char: ""
      });
    }

    for (const [id, anchorPos] of faunaAnchors) {
      const pos = interpolatedPositions?.get(id) ||
        anchorPos;
      entities.push({
        id,
        type: "fauna",
        pos: pos.clone(),
        char: ""
      });
    }

    const activeView = viewManager.getActiveView();
    if (activeView) {
      activeView.updateEntities(entities);
    }
  };

  const onInitialState = (gameState: any) => {
    if (gameState.terrain) {
      currentTerrain = gameState.terrain;
      if (currentTerrain) {
        lidarView.updateTerrain(currentTerrain);
        sphereView.updateTerrain(currentTerrain);
      }
    }

    if (
      gameStateProvider &&
      gameStateProvider.phase === "lobby"
    ) {
      lobbyView.show();
      if (gameState.players) {
        lobbyView.updatePlayerQueue(gameState.players);
      }
    } else {
      lobbyView.hide();
      if (gameState.players) {
        updatePlayerAnchors(gameState.players);
      }
    }

    if (gameState.fauna) {
      updateFaunaAnchors(gameState.fauna);
    }
    updateEntitiesList();
  };

  const onStateUpdate = (update: {
    players?: PlayerTuple[];
    fauna?: PlayerTuple[];
  }) => {
    if (
      gameStateProvider &&
      gameStateProvider.phase === "lobby"
    ) {
      lobbyView.show();
      if (update.players) {
        lobbyView.updatePlayerQueue(update.players);
      }
    } else {
      lobbyView.hide();
      if (update.players) {
        updatePlayerAnchors(update.players);
      }
    }

    if (update.fauna) updateFaunaAnchors(update.fauna);
  };

  const joinSector = (sector: Sector) => {
    console.log(`Connecting: ${sector.name}`);
    console.log(`Sector ID: ${sector.id}`);
    try {
      if (gameStateProvider) return;

      gameStateProvider = new GameStateProvider(
        sector.id,
        onInitialState,
        onStateUpdate
      );
      gameStateProvider.start();

      startUpdateLoop();
    } catch (error) {
      console.error("Could not connect:", error);
    }
  };

  // --- Sector Selection Handler ---
  lobbyView.onSectorSelect(joinSector);

  // --- Auto-join for developers ---
  lobbyView.show();
  const params = new URLSearchParams(
    window.location.search
  );
  if (params.get("join") !== "false") {
    console.log("Auto-joining first sector in 2 seconds...");
    setTimeout(() => {
      joinSector(mockSectors[0]);

      console.log("%c=======================================", "color: #00ff00; font-weight: bold;");
      console.log("%cMUTONEX WEBCLIENT DEBUG CONTROLS:", "color: #00ff00; font-weight: bold;");
      console.log("%c=======================================", "color: #00ff00; font-weight: bold;");
      console.log("W,A,S,D   : Move Avatar");
      console.log("Tab       : Toggle View (Lidar/Sphere)");
      console.log("L         : Toggle Lidar Mode (Horiz/Vert)");
      console.log("[ and ]   : Adjust Lidar Entropy (Noise)");
      console.log("=======================================");
    }, 2000);
  }

  // --- Avatar Controls & Loop ---
  function startUpdateLoop() {
    const keysPressed: { [key: string]: boolean } = {};
    const AVATAR_SPEED = 20.0;
    const FAUNA_SPEED = 0.5;
    let lastTime = performance.now();

    window.addEventListener("keydown", (e) => {
      keysPressed[e.key.toLowerCase()] = true;

      if (e.key === "Tab") {
        e.preventDefault();
        const current = viewManager.getActiveView();
        const next =
          current === lidarView ? sphereView : lidarView;
        viewManager.setActiveView(next);
        if (currentTerrain) {
          next.updateTerrain(currentTerrain);
        }
        updateEntitiesList();
      }

      if (e.key.toLowerCase() === "l") {
        const isVert = lidarMode === "vertical";
        lidarMode = isVert ? "horizontal" : "vertical";
        lidarView.setScanMode(lidarMode);
        console.log("Lidar Mode:", lidarMode);
      }

      if (e.key === "[") {
        lidarView.entropy = Math.max(0.0, lidarView.entropy - 0.1);
        console.log("Lidar Entropy:", lidarView.entropy);
      }
      if (e.key === "]") {
        lidarView.entropy = Math.min(1.0, lidarView.entropy + 0.1);
        console.log("Lidar Entropy:", lidarView.entropy);
      }
    });

    window.addEventListener("keyup", (e) => {
      keysPressed[e.key.toLowerCase()] = false;
    });

    function updateLoop() {
      requestAnimationFrame(updateLoop);

      if (
        gameStateProvider &&
        gameStateProvider.phase === "lobby"
      ) {
        return;
      }

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
          const step = FAUNA_SPEED * delta;
          target.add(dir.multiplyScalar(step));
        } else {
          const rx = (Math.random() - 0.5) *
            FAUNA_SPEED * delta * 2;
          const rz = (Math.random() - 0.5) *
            FAUNA_SPEED * delta * 2;
          target.x += rx;
          target.z += rz;
        }
        currentInterp.set(id, target);
      }

      const moveDir = new THREE.Vector3(0, 0, 0);
      if (keysPressed["w"] || keysPressed["arrowup"]) {
        moveDir.z -= 1;
      }
      if (keysPressed["s"] || keysPressed["arrowdown"]) {
        moveDir.z += 1;
      }
      if (keysPressed["a"] || keysPressed["arrowleft"]) {
        moveDir.x -= 1;
      }
      if (keysPressed["d"] || keysPressed["arrowright"]) {
        moveDir.x += 1;
      }

      if (
        gameStateProvider &&
        gameStateProvider.phase === "gamein" &&
        moveDir.lengthSq() > 0
      ) {
        moveDir.normalize();
        const moveVec = moveDir.multiplyScalar(
          AVATAR_SPEED * delta
        );

        const activeView = viewManager.getActiveView();
        if (activeView) {
          activeView.camera.position.add(moveVec);
          const controls = activeView.controls;
          if (controls && controls.target) {
            controls.target.add(moveVec);
          }
        }

        localPlayerPos.add(moveVec);

        const dist = localPlayerPos.distanceTo(
          lastSentPosition
        );
        if (dist > 1.0) {
          gameStateProvider.sendAvatarPosition([
            localPlayerPos.x,
            localPlayerPos.z,
            0
          ]);
          lastSentPosition.copy(localPlayerPos);
        }
      }

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
