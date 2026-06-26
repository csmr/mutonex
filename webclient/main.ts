// webclient/main.ts
import "./global_types.ts";
import { GameStateProvider } from "./GameStateProvider.ts";
import { ViewManager, IView } from "./ViewManager.ts";
import { LidarView } from "./LidarView.ts";
import { LidarStyles } from "./LidarStyles.ts";
import { SphereView } from "./SphereView.ts";
import { GlobeView } from "./GlobeView.ts";
import { LobbyView, Sector } from "./LobbyView.ts";
import { AvatarController } from "./AvatarController.ts";
import { sampleTerrainHeight } from "./TerrainMesh.ts";
import { EntityData, EntityType, Terrain } from "./types.ts";
import type { PlayerTuple } from "./MockGameStateProvider.ts";
import { ActionHUD } from "./ActionHUD.ts";
import * as Engine from "./ShortcutEngine.ts";
import { DEV_MODE_ENABLED } from "./env-config.ts";

type ViewSet = {
  viewManager: ViewManager, lidarView: LidarView,
  sphereView: SphereView, globeView: GlobeView
};

function initRenderPipeline(canvas: HTMLCanvasElement): ViewSet {
  const viewManager = new ViewManager(canvas);
  const lidarView = new LidarView(canvas);
  const sphereView = new SphereView(canvas);
  const globeView = new GlobeView({}, canvas);
  viewManager.setActiveView(lidarView);
  return { viewManager, lidarView, sphereView, globeView };
}

function bindDebugConsole(viewSet: ViewSet) {
  const { lidarView, viewManager } = viewSet;
  (window as any).__mutonex = {
    lidarView, viewManager, renderer: (viewManager as any).renderer
  };
  (window as any).__mutonex.lidarView.setStyle = (styleName: string) => {
    if (LidarStyles[styleName]) lidarView.setLidarStyle(styleName);
  };
  Engine.printHelp();
}

function stepFauna(
  anch: any,
  t: any,
  dt: number
): any {
  if (t.distanceTo(anch) > 5.0) {
    return t.add(
      new THREE.Vector3()
        .subVectors(anch, t)
        .normalize()
        .multiplyScalar(0.5 * dt)
    );
  }
  t.x += (Math.random() - 0.5) * 0.25 * dt;
  t.z += (Math.random() - 0.5) * 0.25 * dt;
  return t;
}

function updateFauna(
  fAnchors: Map<string, any>,
  fTargets: Map<string, any>,
  dt: number
): Map<string, any> {
  const interp = new Map<string, any>();
  fAnchors.forEach((anch, id) => {
    let t = fTargets.get(id);
    if (!t) {
      t = anch.clone();
      fTargets.set(id, t);
    }
    interp.set(id, stepFauna(anch, t, dt));
  });
  return interp;
}

function getEntityPos(terrain: any | null, pos: any) {
  const cloned = pos.clone();
  if (terrain) cloned.y = sampleTerrainHeight(terrain, cloned.x, cloned.z);
  return cloned;
}

function computeEntities(
  terrain: any | null,
  playerAnchors: Map<string, any>,
  playerCharm: Map<string, number>,
  faunaAnchors: Map<string, any>,
  mineralAnchors: Map<string, any>,
  interpolation?: Map<string, any>
): EntityData[] {
  const entities: EntityData[] = [];
  playerAnchors.forEach((pos, id) => entities.push({
    id, type: "player", pos: getEntityPos(terrain, pos), char: "",
    charm: playerCharm.get(id) || 0
  }));
  faunaAnchors.forEach((pos, id) => entities.push({
    id, type: "fauna", pos: getEntityPos(terrain, interpolation?.get(id) || pos), char: ""
  }));
  mineralAnchors.forEach((pos, id) => entities.push({
    id, type: "mineral", pos: getEntityPos(terrain, pos), char: ""
  }));
  (window as any).itemAnchors?.forEach((data: any, id: string) => {
    entities.push({
      id, type: `item_${data.type}` as EntityType,
      pos: getEntityPos(terrain, data.pos), char: ""
    });
  });
  return entities;
}

function bindActionHUD(
  getProvider: () => GameStateProvider | null,
  entities: EntityData[],
  avatar: AvatarController,
  actionHUD: ActionHUD
) {
  actionHUD.setOnCharmClick(() => {
    const provider = getProvider();
    if (!provider || provider.phase !== "gamein") return;
    const targets = entities
      .filter((ent) => ent.id !== provider.playerId)
      .map((ent) => ({ id: ent.id, dist: avatar.position.distanceTo(ent.pos) }))
      .filter((target) => target.dist <= 20.0)
      .sort((a, b) => a.dist - b.dist);
    if (targets.length > 0) provider.sendPlayerAction("charm", targets[0].id);
  });
  actionHUD.setOnPickUpClick((id) => getProvider()?.sendPlayerAction("pick_up", id));
  actionHUD.setOnDropClick((id) => {
    const fwd = avatar.getForwardVector();
    getProvider()?.sendPlayerAction("drop_item", id, { x: fwd.x, y: fwd.y, z: fwd.z });
  });
}

function syncUI(
    viewSet: ViewSet,
    lobby: LobbyView,
    hud: ActionHUD,
    gp: GameStateProvider | null,
    handlers: Engine.HandlerMap,
    cleanup: { controller: AbortController | null },
    pressedActions: Set<string>
): string {
    const active = viewSet.viewManager.getActiveView();
    const phase = gp?.phase || "lobby";
    if (active === viewSet.globeView) {
        lobby.hide(); hud.hide();
    } else if (phase === "gamein") {
        hud.show(); lobby.hide();
    } else {
        lobby.show(); hud.hide();
    }

    pressedActions.clear();

    if (cleanup.controller) cleanup.controller.abort();
    const isGlobeScope = active === viewSet.globeView ||
        active === viewSet.sphereView;
    const scope = isGlobeScope ? "globe" :
        (phase === "gamein" ? "game" : "lobby");
    cleanup.controller = Engine.activateContext(scope, handlers);
    return phase + ":" + (isGlobeScope ? "globe" : "local");
}

function main() {
  const canvas = document.getElementById("main-canvas") as HTMLCanvasElement;
  if (!canvas) return;
  const viewSet = initRenderPipeline(canvas); bindDebugConsole(viewSet);
  let provider: GameStateProvider | null = null, currentContextKey = "";
  const cleanup = { controller: null as AbortController | null };
  const lobby = new LobbyView(), hud = new ActionHUD(), pressedActions = new Set<string>();
  const avatar = new AvatarController(viewSet.viewManager, () => provider, (act) => pressedActions.has(act));
  const entities: EntityData[] = [], playerAnchors = new Map<string, any>(), playerCharm = new Map<string, number>(), faunaAnchors = new Map<string, any>(), faunaTargets = new Map<string, any>(), mineralAnchors = new Map<string, any>(), itemAnchors = new Map<string, any>();
  (window as any).itemAnchors = itemAnchors;

  let handlers: Engine.HandlerMap = new Map();
  handlers = Engine.registerHandler(handlers, "toggle_view", (entry, event) => {
    if (event.type !== "keydown") return;
    if (viewSet.viewManager.getActiveView() === viewSet.globeView) return;
    const cur = viewSet.viewManager.getActiveView();
    viewSet.viewManager.setActiveView(
      cur === viewSet.lidarView ? viewSet.sphereView : viewSet.lidarView
    );
    currentContextKey = syncUI(
      viewSet, lobby, hud, provider, handlers, cleanup, pressedActions
    );
  });
  handlers = Engine.registerHandler(handlers, "toggle_globe", (entry, event) => {
    if (event.type !== "keydown") return;
    if (!DEV_MODE_ENABLED) return;
    const cur = viewSet.viewManager.getActiveView();
    viewSet.viewManager.setActiveView(
      cur === viewSet.globeView ? viewSet.lidarView : viewSet.globeView
    );
    currentContextKey = syncUI(
      viewSet, lobby, hud, provider, handlers, cleanup, pressedActions
    );
  });
  handlers = Engine.registerHandler(handlers, "cycle_style", (entry, event) => {
    if (event.type !== "keydown") return;
    if (viewSet.viewManager.getActiveView() !== viewSet.lidarView) return;
    const styles = Object.keys(LidarStyles);
    const cur = viewSet.lidarView.currentStyleName;
    const nextIdx = (styles.indexOf(cur) + 1) % styles.length;
    viewSet.lidarView.setLidarStyle(styles[nextIdx]);
  });
  handlers = Engine.registerHandler(handlers, "dec_entropy", (entry, event) => {
    if (event.type !== "keydown") return;
    if (viewSet.viewManager.getActiveView() === viewSet.lidarView) {
      viewSet.lidarView.entropy = Math.max(0, viewSet.lidarView.entropy - 0.1);
    }
  });
  handlers = Engine.registerHandler(handlers, "inc_entropy", (entry, event) => {
    if (event.type !== "keydown") return;
    if (viewSet.viewManager.getActiveView() === viewSet.lidarView) {
      viewSet.lidarView.entropy = Math.min(1, viewSet.lidarView.entropy + 0.1);
    }
  });
  handlers = Engine.registerHandler(handlers, "lobby_prev", (entry, event) => {
    if (event.type !== "keydown") return;
    if (provider?.phase === "lobby") lobby.navigate(-1);
  });
  handlers = Engine.registerHandler(handlers, "lobby_next", (entry, event) => {
    if (event.type !== "keydown") return;
    if (provider?.phase === "lobby") lobby.navigate(1);
  });
  handlers = Engine.registerHandler(handlers, "lobby_join", (entry, event) => {
    if (event.type !== "keydown") return;
    if (!provider || provider.phase === "lobby") lobby.confirmSelection();
  });
  handlers = Engine.registerHandler(handlers, "toggle_diag", (entry, event) => {
    if (event.type !== "keydown") return;
    const view = viewSet.viewManager.getActiveView();
    if (view === viewSet.globeView) {
      viewSet.globeView.setDiagMode!(!viewSet.globeView.diagEnabled);
    }
  });
  handlers = Engine.registerHandler(handlers, "rot_up", (entry, event) => {
    if (event.type !== "keydown") return;
    const view = viewSet.viewManager.getActiveView();
    if (view === viewSet.globeView || view === viewSet.sphereView) {
      view.rotate?.("up");
    }
  });
  handlers = Engine.registerHandler(handlers, "rot_down", (entry, event) => {
    if (event.type !== "keydown") return;
    const view = viewSet.viewManager.getActiveView();
    if (view === viewSet.globeView || view === viewSet.sphereView) {
      view.rotate?.("down");
    }
  });
  handlers = Engine.registerHandler(handlers, "rot_left", (entry, event) => {
    if (event.type !== "keydown") return;
    const view = viewSet.viewManager.getActiveView();
    if (view === viewSet.globeView || view === viewSet.sphereView) {
      view.rotate?.("left");
    }
  });
  handlers = Engine.registerHandler(handlers, "rot_right", (entry, event) => {
    if (event.type !== "keydown") return;
    const view = viewSet.viewManager.getActiveView();
    if (view === viewSet.globeView || view === viewSet.sphereView) {
      view.rotate?.("right");
    }
  });

  const moveActions = ["move_fwd", "move_back", "move_left", "move_right"];
  moveActions.forEach(act => {
    handlers = Engine.registerHandler(handlers, act, (entry, event) => {
        if (event.type === "keydown") pressedActions.add(act);
        else pressedActions.delete(act);
    });
  });

  lobby.renderSectorList([
    { id: "game:sector_alpha", name: "Sector Alpha (Dev)" },
    { id: "game:sector_beta", name: "Sector Beta (Test)" }
  ]);
  bindActionHUD(() => provider, entities, avatar, hud);
  currentContextKey = syncUI(
    viewSet, lobby, hud, provider, handlers, cleanup, pressedActions
  );

  const updateEnts = (interp?: Map<string, any>) => {
    const active = viewSet.viewManager.getActiveView();
    const newEnts = computeEntities(active?.terrainMesh, playerAnchors, playerCharm, faunaAnchors, mineralAnchors, interp);
    entities.length = 0; entities.push(...newEnts); active?.updateEntities(entities, provider?.playerId || undefined);
  };

  const syncP = (players: PlayerTuple[]) => {
    players.forEach(([id, x, y, z, charm, inv]) => {
      playerAnchors.set(id, new THREE.Vector3(x, 1, z)); if (charm !== undefined) playerCharm.set(id, charm);
      if (provider && id === provider.playerId) { hud.setCharmLevel(charm); if (inv) hud.setInventory(inv); }
    });
  };

  const onInit = (gs: any) => {
    Engine.printHelp();
    if (gs.terrain) {
      viewSet.lidarView.updateTerrain(gs.terrain);
      viewSet.sphereView.updateTerrain(gs.terrain);
    }
    if (gs.players && provider) {
      syncP(gs.players);
      lobby.updatePlayerQueue(gs.players);
    }
    if (gs.fauna) {
      gs.fauna.forEach(([id, x, y, z]: any) =>
        faunaAnchors.set(id, new THREE.Vector3(x, 1, z))
      );
    }
    if (gs.minerals) {
      gs.minerals.forEach((min: any) =>
        mineralAnchors.set(
          min.id,
          new THREE.Vector3(min.position.x, 1, min.position.z)
        )
      );
    }
    currentContextKey = syncUI(
      viewSet, lobby, hud, provider, handlers, cleanup, pressedActions
    );
    updateEnts();
  };

  const onUpdate = (update: any) => {
    if (update.players && provider) {
      syncP(update.players);
      if (provider.phase === "lobby") {
        lobby.updatePlayerQueue(update.players);
      }
    }
    if (update.fauna) {
      update.fauna.forEach(([id, x, y, z]: any) =>
        faunaAnchors.set(id, new THREE.Vector3(x, 1, z))
      );
    }
    if (update.items) {
      itemAnchors.clear();
      update.items.forEach((item: any) =>
        itemAnchors.set(
          item.id,
          {
            pos: new THREE.Vector3(item.position.x, 1, item.position.z),
            type: item.type
          }
        )
      );
    }
    const active = viewSet.viewManager.getActiveView();
    const isGlobeScope = active === viewSet.globeView ||
        active === viewSet.sphereView;
    const nextKey = (provider?.phase || "lobby") + ":" +
        (isGlobeScope ? "globe" : "local");
    if (nextKey !== currentContextKey) {
      currentContextKey = syncUI(
        viewSet, lobby, hud, provider, handlers, cleanup, pressedActions
      );
    }
  };

  lobby.onSectorSelect(sector => { if (!provider) { provider = new GameStateProvider(sector.id, onInit, onUpdate); provider.start(); loop(); } });
  if (new URLSearchParams(window.location.search).get("join") !== "false") setTimeout(() => !provider && lobby.confirmSelection(), 2000);

  const mouse = new THREE.Vector2();
  window.addEventListener("mousemove", e => { mouse.x = (e.clientX/window.innerWidth)*2-1; mouse.y = -(e.clientY/window.innerHeight)*2+1; });
  canvas.addEventListener("click", () => {
    const cur = viewSet.viewManager.getActiveView(); if (!cur || !provider || !cur.raycastEnabled) return;
    const rc = new THREE.Raycaster(); rc.setFromCamera(mouse, cur.camera);
    const hits = rc.intersectObjects(cur.getInteractableObjects(), true);
    for (const h of hits) {
      const d = h.object.userData; if (d && d.entityId && (d.entityType as string).startsWith("item")) {
        if (avatar.position.distanceTo(h.point) <= 15.0) provider.sendPlayerAction("pick_up", d.entityId); break;
      }
    }
  });

  function loop() {
    let lastTime = performance.now(); viewSet.viewManager.animate();
    const tick = () => {
      requestAnimationFrame(tick); if (provider?.phase === "lobby") return;
      const now = performance.now(), dt = (now - lastTime) / 1000; lastTime = now;
      const interp = updateFauna(faunaAnchors, faunaTargets, dt);
      const nearby = Array.from(itemAnchors.entries()).map(([id, data]: any) => ({ id, dist: avatar.position.distanceTo(data.pos) })).filter(i => i.dist <= 15.0).sort((a,b) => a.dist - b.dist);
      hud.setNearbyItem(nearby.length > 0 ? { id: nearby[0].id, name: nearby[0].id.replace("item_", "") } : null);
      const cur = viewSet.viewManager.getActiveView();
      if (cur && cur.raycastEnabled) {
        const rc = new THREE.Raycaster(); rc.setFromCamera(mouse, cur.camera);
        const hits = rc.intersectObjects(cur.getInteractableObjects(), true);
        let hT = null;
        for (const h of hits) {
          const d = h.object.userData; if (d && d.entityId && (d.entityType as string).startsWith("item")) { hT = { id: d.entityId, name: d.entityId.replace("item_", "") }; break; }
        }
        hud.setHoveredItem(hT);
      }
      avatar.update(dt); updateEnts(interp);
    };
    tick();
  }
}
window.addEventListener("DOMContentLoaded", main);
