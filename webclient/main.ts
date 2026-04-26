// webclient/main.ts
import "./global_types.ts";
import { GameStateProvider } from "./GameStateProvider.ts";
import { ViewManager } from "./ViewManager.ts";
import { LidarView } from "./LidarView.ts";
import { LidarStyles } from "./LidarStyles.ts";
import { SphereView } from "./SphereView.ts";
import { LobbyView, Sector } from "./LobbyView.ts";
import { AvatarController } from "./AvatarController.ts";
import { sampleTerrainHeight } from "./TerrainMesh.ts";
import { EntityData, EntityType, Terrain } from "./types.ts";
import type { PlayerTuple } from "./MockGameStateProvider.ts";
import { ActionHUD } from "./ActionHUD.ts";

function initRenderPipeline(canvas: HTMLCanvasElement) {
  const viewManager = new ViewManager(canvas);
  const lidarView = new LidarView(canvas);
  const sphereView = new SphereView(canvas);
  viewManager.setActiveView(lidarView);
  return { viewManager, lidarView, sphereView };
}

function bindDebugConsole(viewManager: ViewManager, lidarView: LidarView) {
  window.__mutonex = { lidarView, viewManager, renderer: (viewManager as any).renderer };
  (window.__mutonex.lidarView as any).setStyle = (styleName: string) => {
    if (LidarStyles[styleName]) lidarView.setLidarStyle(styleName);
  };
  console.log(
    "%cMutonex Webclient%c\n\nControls:\n  Left Click + Drag  : Rotate camera\n  Right Click + Drag : Pan camera\n  Scroll Wheel       : Zoom in/out\n\nLidar Rendering:\n  To change Lidar scanning modes, use the console command:\n  %cwindow.__mutonex.lidarView.setStyle('styleName')%c\n\nAvailable Styles:\n" +
    Object.keys(LidarStyles).map(s => `  - ${s}`).join('\n'),
    "font-size: 16px; font-weight: bold; color: #1E90FF;", "",
    "background: #222; color: #0f0; padding: 2px 4px; border-radius: 2px;", ""
  );

  console.log("%c=======================================", "color: #00ff00; font-weight: bold;");
  console.log("%cMUTONEX WEBCLIENT DEBUG CONTROLS:", "color: #00ff00; font-weight: bold;");
  console.log("%c=======================================", "color: #00ff00; font-weight: bold;");
  console.log("W,A,S,D   : Move Avatar");
  console.log("Tab       : Toggle View (Lidar/Sphere)");
  console.log("L         : Toggle Lidar Mode (Horiz/Vert)");
  console.log("[ and ]   : Adjust Lidar Entropy (Noise)");
  console.log("=======================================");
}

function computeEntityState(
  terrainMesh: any | null,
  playerAnchors: Map<string, any>,
  playerCharm: Map<string, number>,
  faunaAnchors: Map<string, any>,
  mineralAnchors: Map<string, any>,
  interpolatedPositions?: Map<string, any>
): EntityData[] {
  const entities: EntityData[] = [];
  for (const [id, pos] of playerAnchors) {
    const p = pos.clone();
    if (terrainMesh) p.y = sampleTerrainHeight(terrainMesh, p.x, p.z);
    entities.push({ id, type: "player", pos: p, char: "", charm: playerCharm.get(id) || 0 });
  }
  for (const [id, anchorPos] of faunaAnchors) {
    const p = (interpolatedPositions?.get(id) || anchorPos).clone();
    if (terrainMesh) p.y = sampleTerrainHeight(terrainMesh, p.x, p.z);
    entities.push({ id, type: "fauna", pos: p, char: "" });
  }
  for (const [id, anchorPos] of mineralAnchors) {
    const p = anchorPos.clone();
    if (terrainMesh) p.y = sampleTerrainHeight(terrainMesh, p.x, p.z);
    entities.push({ id, type: "mineral", pos: p, char: "" });
  }
  for (const [id, data] of (window as any).itemAnchors || []) {
    const p = data.pos.clone();
    if (terrainMesh) p.y = sampleTerrainHeight(terrainMesh, p.x, p.z);
    entities.push({ id, type: `item_${data.type}` as EntityType, pos: p, char: "" });
  }
  return entities;
}

function bindActionHUD(getProvider: () => GameStateProvider | null, entities: EntityData[], avatar: AvatarController, actionHUD: ActionHUD) {
  actionHUD.setOnCharmClick(() => {
    const p = getProvider();
    if (!p || p.phase !== "gamein") return;
    const targets = entities
      .filter((ent) => ent.id !== p.playerId)
      .map((ent) => ({ id: ent.id, dist: avatar.position.distanceTo(ent.pos) }))
      .filter((t) => t.dist <= 20.0)
      .sort((a, b) => a.dist - b.dist);

    if (targets.length > 0) {
      console.log(`[Charm] Attempting to charm target: ${targets[0].id} at dist ${targets[0].dist.toFixed(2)}`);
      p.sendPlayerAction("charm", targets[0].id);
    } else {
      console.log("[Charm] No valid targets within range.");
    }
  });

  actionHUD.setOnPickUpClick((itemId) => {
    const p = getProvider();
    if (p) p.sendPlayerAction("pick_up", itemId);
  });

  actionHUD.setOnDropClick((itemId) => {
    const p = getProvider();
    if (p) {
      const forward = avatar.getForwardVector();
      p.sendPlayerAction("drop_item", itemId, { x: forward.x, y: forward.y, z: forward.z });
    }
  });
}

function main() {
  const canvas = document.getElementById("main-canvas") as HTMLCanvasElement;
  if (!canvas) return;

  const { viewManager, lidarView, sphereView } = initRenderPipeline(canvas);
  bindDebugConsole(viewManager, lidarView);
  
  let gameStateProvider: GameStateProvider | null = null;
  const lobbyView = new LobbyView();
  const actionHUD = new ActionHUD();
  const avatar = new AvatarController(viewManager, () => gameStateProvider);

  const mockSectors: Sector[] = [
    { id: "game:sector_alpha", name: "Sector Alpha (Dev)" },
    { id: "game:sector_beta", name: "Sector Beta (Test)" },
    { id: "game:sector_gamma", name: "Sector Gamma (High Pop)" },
  ];
  lobbyView.renderSectorList(mockSectors);

  let currentTerrain: Terrain | null = null;
  const playerAnchors = new Map<string, any>();
  const playerCharm = new Map<string, number>();
  const faunaAnchors = new Map<string, any>();
  const faunaTargets = new Map<string, any>();
  const mineralAnchors = new Map<string, any>();
  const itemAnchors = new Map<string, any>(); // Added itemAnchors
  (window as any).itemAnchors = itemAnchors;
  const entities: EntityData[] = [];

  bindActionHUD(() => gameStateProvider, entities, avatar, actionHUD);

  const updateEntitiesList = (interpolatedPositions?: Map<string, any>) => {
    const activeView = viewManager.getActiveView();
    const terrainMesh = activeView?.terrainMesh;
    const newEntities = computeEntityState(terrainMesh, playerAnchors, playerCharm, faunaAnchors, mineralAnchors, interpolatedPositions);
    entities.length = 0;
    entities.push(...newEntities);
    if (activeView) activeView.updateEntities(entities, gameStateProvider?.playerId || undefined);
  };

  const syncPlayers = (players: PlayerTuple[]) => {
    for (const [id, x, y, z, charm, inventory] of players as any[]) {
      playerAnchors.set(id, new THREE.Vector3(x, 1, z));
      if (charm !== undefined) {
        playerCharm.set(id, charm);
        if (gameStateProvider && id === gameStateProvider.playerId) {
          actionHUD.setCharmLevel(charm);
          if (inventory) actionHUD.setInventory(inventory);
        }
      }
    }
  };

  const onInitialState = (gameState: any) => {
    if (gameState.terrain) {
      currentTerrain = gameState.terrain;
      lidarView.updateTerrain(currentTerrain!);
      sphereView.updateTerrain(currentTerrain!);
    }
    if (gameStateProvider?.phase === "lobby") {
      lobbyView.show();
      if (gameState.players) lobbyView.updatePlayerQueue(gameState.players);
    } else {
      lobbyView.hide();
      actionHUD.show();
      if (gameState.players) syncPlayers(gameState.players);
    }
    if (gameState.fauna) {
      for (const [id, x, y, z] of gameState.fauna) faunaAnchors.set(id, new THREE.Vector3(x, 1, z));
    }
    if (gameState.minerals) {
      for (const min of gameState.minerals) mineralAnchors.set(min.id, new THREE.Vector3(min.position.x, 1, min.position.z));
    }
    if (gameState.items) {
      for (const item of gameState.items) {
        itemAnchors.set(item.id, {
          pos: new THREE.Vector3(item.position.x, 1, item.position.z),
          type: item.type
        });
      }
    }
    updateEntitiesList();
  };

  const onStateUpdate = (update: any) => {
    if (gameStateProvider?.phase === "lobby") {
      lobbyView.show();
      if (update.players) lobbyView.updatePlayerQueue(update.players);
    } else {
      lobbyView.hide();
      actionHUD.show();
      if (update.players) syncPlayers(update.players);
    }
    if (update.fauna) {
      for (const [id, x, y, z] of update.fauna) faunaAnchors.set(id, new THREE.Vector3(x, 1, z));
    }
    if (update.items) {
      itemAnchors.clear();
      for (const item of update.items) {
        itemAnchors.set(item.id, {
          pos: new THREE.Vector3(item.position.x, 1, item.position.z),
          type: item.type
        });
      }
    }
  };

  const joinSector = (sector: Sector) => {
    if (gameStateProvider) return;
    gameStateProvider = new GameStateProvider(sector.id, onInitialState, onStateUpdate);
    gameStateProvider.start();
    startUpdateLoop();
  };

  lobbyView.onSectorSelect(joinSector);
  lobbyView.show();

  const params = new URLSearchParams(window.location.search);
  if (params.get("join") !== "false") setTimeout(() => joinSector(mockSectors[0]), 2000);

  function startUpdateLoop() {
    let lastTime = performance.now();
    viewManager.animate();

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
        const idx = styles.indexOf(lidarView.currentStyleName);
        lidarView.setLidarStyle(styles[(idx + 1) % styles.length]);
      }
      if (e.key === "[") lidarView.entropy = Math.max(0, lidarView.entropy - 0.1);
      if (e.key === "]") lidarView.entropy = Math.min(1, lidarView.entropy + 0.1);
    });

    const FAUNA_SPEED = 0.5;
    function updateLoop() {
      requestAnimationFrame(updateLoop);
      if (gameStateProvider?.phase === "lobby") return;

      const now = performance.now();
      const delta = (now - lastTime) / 1000;
      lastTime = now;

      const currentInterp = new Map<string, any>();
      for (const [id, anchor] of faunaAnchors) {
        let target = faunaTargets.get(id);
        if (!target) { target = anchor.clone(); faunaTargets.set(id, target); }
        if (target.distanceTo(anchor) > 5.0) {
          target.add(new THREE.Vector3().subVectors(anchor, target).normalize().multiplyScalar(FAUNA_SPEED * delta));
        } else {
          target.x += (Math.random() - 0.5) * FAUNA_SPEED * delta * 2;
          target.z += (Math.random() - 0.5) * FAUNA_SPEED * delta * 2;
        }
        currentInterp.set(id, target);
      }

      const nearby = Array.from(itemAnchors.entries())
        .map(([id, pos]) => ({ id, dist: avatar.position.distanceTo(pos) }))
        .filter(i => i.dist <= 15.0)
        .sort((a,b) => a.dist - b.dist);
      
      if (nearby.length > 0) {
        actionHUD.setNearbyItem({ id: nearby[0].id, name: nearby[0].id.replace("item_", "") });
      } else {
        actionHUD.setNearbyItem(null);
      }

      avatar.update(delta);
      updateEntitiesList(currentInterp);

      // Raycasting for 3D interaction
      const currentView = viewManager.getActiveView();
      if (currentView) {
        const interactables = currentView.getInteractableObjects();
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, currentView.camera);
        const intersects = raycaster.intersectObjects(interactables, true);
        
        let hoverTarget: { id: string, name: string } | null = null;
        for (const hit of intersects) {
          const data = hit.object.userData;
          if (data && data.entityId && (data.entityType as string).startsWith("item")) {
            hoverTarget = { id: data.entityId, name: data.entityId.replace("item_", "") };
            break;
          }
        }
        actionHUD.setHoveredItem(hoverTarget);
      }
    }
    updateLoop();

    const mouse = new THREE.Vector2();
    window.addEventListener("mousemove", (e) => {
      mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    });

    canvas.addEventListener("click", () => {
      const activeView = viewManager.getActiveView();
      if (!activeView || !gameStateProvider) return;

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, activeView.camera);
      const intersects = raycaster.intersectObjects(activeView.getInteractableObjects(), true);

      for (const hit of intersects) {
        const data = hit.object.userData;
        if (data && data.entityId && (data.entityType as string).startsWith("item")) {
          const dist = avatar.position.distanceTo(hit.point);
          if (dist <= 15.0) {
            console.log(`[Interaction] Picking up item via click: ${data.entityId}`);
            gameStateProvider.sendPlayerAction("pick_up", data.entityId);
          } else {
            console.log(`[Interaction] Item ${data.entityId} too far to pick up: ${dist.toFixed(2)}m`);
          }
          break;
        }
      }
    });
  }
}

window.addEventListener("DOMContentLoaded", main);
