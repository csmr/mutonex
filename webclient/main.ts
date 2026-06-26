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
import { ShortcutModifiers } from "./ShortcutConfig.ts";

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

function syncUI(viewSet: ViewSet, lobby: LobbyView, hud: ActionHUD, gp: GameStateProvider | null) {
  const active = viewSet.viewManager.getActiveView();
  if (active === viewSet.globeView) {
    lobby.hide(); hud.hide();
  } else if (gp && gp.phase === "gamein") {
    hud.show(); lobby.hide();
  } else {
    lobby.show(); hud.hide();
  }
}

function bindViewToggles(
  vs: ViewSet,
  handlers: Engine.HandlerMap,
  lobby: LobbyView,
  hud: ActionHUD,
  getGP: () => GameStateProvider | null,
  resetKeys: () => void
): Engine.HandlerMap {
  let h = handlers;
  h = Engine.registerHandler(h, "toggle_view", () => {
    if (vs.viewManager.getActiveView() === vs.globeView) return;
    vs.viewManager.setActiveView(vs.viewManager.getActiveView() === vs.lidarView ? vs.sphereView : vs.lidarView);
    resetKeys(); syncUI(vs, lobby, hud, getGP());
  });
  h = Engine.registerHandler(h, "toggle_globe", () => {
    vs.viewManager.setActiveView(vs.viewManager.getActiveView() === vs.globeView ? vs.lidarView : vs.globeView);
    resetKeys(); syncUI(vs, lobby, hud, getGP());
  });
  return h;
}

function bindGameControls(vs: ViewSet, handlers: Engine.HandlerMap): Engine.HandlerMap {
  let h = handlers;
  h = Engine.registerHandler(h, "cycle_style", () => {
    if (vs.viewManager.getActiveView() !== vs.lidarView) return;
    const styles = Object.keys(LidarStyles);
    vs.lidarView.setLidarStyle(styles[(styles.indexOf(vs.lidarView.currentStyleName) + 1) % styles.length]);
  });
  h = Engine.registerHandler(h, "dec_entropy", () => {
    if (vs.viewManager.getActiveView() === vs.lidarView) vs.lidarView.entropy = Math.max(0, vs.lidarView.entropy - 0.1);
  });
  h = Engine.registerHandler(h, "inc_entropy", () => {
    if (vs.viewManager.getActiveView() === vs.lidarView) vs.lidarView.entropy = Math.min(1, vs.lidarView.entropy + 0.1);
  });
  return h;
}

function bindLobbyGlobe(vs: ViewSet, handlers: Engine.HandlerMap, lobby: LobbyView, getGP: () => GameStateProvider | null): Engine.HandlerMap {
  let h = handlers;
  h = Engine.registerHandler(h, "lobby_prev", () => getGP()?.phase === "lobby" && lobby.navigate(-1));
  h = Engine.registerHandler(h, "lobby_next", () => getGP()?.phase === "lobby" && lobby.navigate(1));
  h = Engine.registerHandler(h, "lobby_join", () => getGP()?.phase === "lobby" && lobby.confirmSelection());
  h = Engine.registerHandler(h, "toggle_diag", () => {
    const view = vs.viewManager.getActiveView();
    if (view === vs.globeView) vs.globeView.setDiagMode!(!vs.globeView.diagEnabled);
  });
  h = Engine.registerHandler(h, "rot_up", () => vs.viewManager.getActiveView() === vs.globeView && vs.globeView.rotate?.("up"));
  h = Engine.registerHandler(h, "rot_down", () => vs.viewManager.getActiveView() === vs.globeView && vs.globeView.rotate?.("down"));
  h = Engine.registerHandler(h, "rot_left", () => vs.viewManager.getActiveView() === vs.globeView && vs.globeView.rotate?.("left"));
  h = Engine.registerHandler(h, "rot_right", () => vs.viewManager.getActiveView() === vs.globeView && vs.globeView.rotate?.("right"));
  return h;
}

function handleInteractions(vs: ViewSet, mouse: THREE.Vector2, avatar: AvatarController, provider: GameStateProvider | null) {
  const cur = vs.viewManager.getActiveView();
  if (!cur || !provider || !cur.raycastEnabled) return;
  const rc = new THREE.Raycaster(); rc.setFromCamera(mouse, cur.camera);
  const hits = rc.intersectObjects(cur.getInteractableObjects(), true);
  for (const h of hits) {
    const d = h.object.userData;
    if (d && d.entityId && (d.entityType as string).startsWith("item")) {
      if (avatar.position.distanceTo(h.point) <= 15.0) provider.sendPlayerAction("pick_up", d.entityId);
      break;
    }
  }
}

function updateFauna(fAnchors: Map<string, any>, fTargets: Map<string, any>, dt: number) {
  const interp = new Map<string, any>();
  fAnchors.forEach((anch, id) => {
    let t = fTargets.get(id); if (!t) { t = anch.clone(); fTargets.set(id, t); }
    if (t.distanceTo(anch) > 5.0) t.add(new THREE.Vector3().subVectors(anch, t).normalize().multiplyScalar(0.5 * dt));
    else { t.x += (Math.random()-0.5)*0.5*dt*2; t.z += (Math.random()-0.5)*0.5*dt*2; }
    interp.set(id, t);
  });
  return interp;
}

function updateHUD(iAnchors: Map<string, any>, avatar: AvatarController, hud: ActionHUD, vs: ViewSet, mouse: THREE.Vector2) {
  const nearby = Array.from(iAnchors.entries()).map(([id, data]: any) => ({ id, dist: avatar.position.distanceTo(data.pos) }))
    .filter(i => i.dist <= 15.0).sort((a,b) => a.dist - b.dist);
  hud.setNearbyItem(nearby.length > 0 ? { id: nearby[0].id, name: nearby[0].id.replace("item_", "") } : null);
  const cur = vs.viewManager.getActiveView();
  if (cur && cur.raycastEnabled) {
    const rc = new THREE.Raycaster(); rc.setFromCamera(mouse, cur.camera);
    const hits = rc.intersectObjects(cur.getInteractableObjects(), true);
    let hT = null;
    for (const h of hits) {
      const d = h.object.userData;
      if (d && d.entityId && (d.entityType as string).startsWith("item")) { hT = { id: d.entityId, name: d.entityId.replace("item_", "") }; break; }
    }
    hud.setHoveredItem(hT);
  }
}

function main() {
  const canvas = document.getElementById("main-canvas") as HTMLCanvasElement;
  if (!canvas) return;
  const viewSet = initRenderPipeline(canvas); bindDebugConsole(viewSet);
  let provider: GameStateProvider | null = null, keyState: Engine.KeyState = new Set(), handlers: Engine.HandlerMap = new Map();
  const lobby = new LobbyView(), hud = new ActionHUD();
  const avatar = new AvatarController(viewSet.viewManager, () => provider, () => keyState);
  const entities: EntityData[] = [], playerAnchors = new Map<string, any>(), playerCharm = new Map<string, number>(), faunaAnchors = new Map<string, any>(), faunaTargets = new Map<string, any>(), mineralAnchors = new Map<string, any>(), itemAnchors = new Map<string, any>();
  (window as any).itemAnchors = itemAnchors;
  lobby.renderSectorList([{ id: "game:sector_alpha", name: "Sector Alpha (Dev)" }, { id: "game:sector_beta", name: "Sector Beta (Test)" }]);
  bindActionHUD(() => provider, entities, avatar, hud);
  handlers = bindViewToggles(viewSet, handlers, lobby, hud, () => provider, () => { keyState = new Set(); });
  handlers = bindGameControls(viewSet, handlers);
  handlers = bindLobbyGlobe(viewSet, handlers, lobby, () => provider);

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
    if (gs.terrain) { viewSet.lidarView.updateTerrain(gs.terrain); viewSet.sphereView.updateTerrain(gs.terrain); }
    if (gs.players) { syncP(gs.players); lobby.updatePlayerQueue(gs.players); }
    if (gs.fauna) gs.fauna.forEach(([id, x, y, z]: any) => faunaAnchors.set(id, new THREE.Vector3(x, 1, z)));
    if (gs.minerals) gs.minerals.forEach((min: any) => mineralAnchors.set(min.id, new THREE.Vector3(min.position.x, 1, min.position.z)));
    syncUI(viewSet, lobby, hud, provider); updateEnts();
  };

  const onUpdate = (update: any) => {
    if (update.players) { syncP(update.players); if (provider?.phase === "lobby") lobby.updatePlayerQueue(update.players); }
    if (update.fauna) update.fauna.forEach(([id, x, y, z]: any) => faunaAnchors.set(id, new THREE.Vector3(x, 1, z)));
    if (update.items) { itemAnchors.clear(); update.items.forEach((item: any) => itemAnchors.set(item.id, { pos: new THREE.Vector3(item.position.x, 1, item.position.z), type: item.type })); }
    syncUI(viewSet, lobby, hud, provider);
  };

  lobby.onSectorSelect(sector => { if (!provider) { provider = new GameStateProvider(sector.id, onInit, onUpdate); provider.start(); loop(); } });
  lobby.show(); if (new URLSearchParams(window.location.search).get("join") !== "false") setTimeout(() => !provider && lobby.confirmSelection(), 2000);

  const getModifiers = (e: KeyboardEvent): ShortcutModifiers => ({ shift: e.shiftKey, ctrl: e.ctrlKey, alt: e.altKey, meta: e.metaKey });
  window.addEventListener("keydown", event => {
    if (["Tab", "Enter", " "].includes(event.key) || event.key.startsWith("Arrow")) event.preventDefault();
    const mods = getModifiers(event), norm = Engine.normalizeKey(event.key, mods);
    if (!keyState.has(norm)) Engine.dispatchSingleActions(event.key, mods, handlers);
    keyState = Engine.pressKey(keyState, event.key, mods);
  });
  window.addEventListener("keyup", event => { keyState = Engine.releaseKey(keyState, event.key, getModifiers(event)); });

  const mouse = new THREE.Vector2();
  window.addEventListener("mousemove", e => { mouse.x = (e.clientX/window.innerWidth)*2-1; mouse.y = -(e.clientY/window.innerHeight)*2+1; });
  canvas.addEventListener("click", () => handleInteractions(viewSet, mouse, avatar, provider));

  function loop() {
    let lastTime = performance.now(); viewSet.viewManager.animate();
    const tick = () => {
      requestAnimationFrame(tick); if (provider?.phase === "lobby") return;
      const now = performance.now(), dt = (now - lastTime) / 1000; lastTime = now;
      const interp = updateFauna(faunaAnchors, faunaTargets, dt); updateHUD(itemAnchors, avatar, hud, viewSet, mouse);
      Engine.dispatchRepeatingActions(keyState, handlers); avatar.update(dt); updateEnts(interp);
    };
    tick();
  }
}
window.addEventListener("DOMContentLoaded", main);
