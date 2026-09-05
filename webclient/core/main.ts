// webclient/core/main.ts
import "./global_types.ts";
import { GameStateProvider } from "./GameStateProvider.ts";
import { ViewManager, ViewSet, IView } from "./ViewManager.ts";
import { LidarView } from "../view/LidarView.ts";
import { LidarStyles } from "../render/LidarStyles.ts";
import { SphereView } from "../view/SphereView.ts";
import { GlobeView } from "../view/GlobeView.ts";
import { LobbyView } from "../view/LobbyView.ts";
import { AvatarController } from "../input/AvatarController.ts";
import { ActionHUD } from "../view/ActionHUD.ts";
import * as ShortcutEngine from "../input/ShortcutEngine.ts";
import { GameStateManager } from "./GameStateManager.ts";
import { InputManager } from "../input/InputManager.ts";

type ContextCleanup = {
  controller: AbortController | null;
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
    lidarView,
    viewManager,
    renderer: (viewManager as any).renderer,
  };
  (window as any).__mutonex.lidarView.setStyle = (
    styleName: string
  ) => {
    if (LidarStyles[styleName]) lidarView.setLidarStyle(styleName);
  };
  ShortcutEngine.printHelp();
}

function triggerCharmAction(
  getProvider: () => GameStateProvider | null,
  gsm: GameStateManager,
  avatar: AvatarController
): void {
  const provider = getProvider();
  if (!provider || provider.phase !== "gamein") return;
  const targets = gsm.entities
    .filter((ent) => ent.id !== provider.playerId)
    .map((ent) => ({
      id: ent.id,
      dist: avatar.position.distanceTo(ent.pos)
    }))
    .filter((target) => target.dist <= 20.0)
    .sort((a, b) => a.dist - b.dist);
  if (targets.length > 0) {
    provider.sendPlayerAction("charm", targets[0].id);
  }
}

function bindActionHUD(
  getProvider: () => GameStateProvider | null,
  gsm: GameStateManager,
  avatar: AvatarController,
  actionHUD: ActionHUD
) {
  actionHUD.setOnCharmClick(() =>
    triggerCharmAction(getProvider, gsm, avatar)
  );
  actionHUD.setOnPickUpClick((id) =>
    getProvider()?.sendPlayerAction("pick_up", id)
  );
  actionHUD.setOnDropClick((id) => {
    const fwd = avatar.getForwardVector();
    getProvider()?.sendPlayerAction("drop_item", id, {
      x: fwd.x, y: fwd.y, z: fwd.z
    });
  });
}

function determineScope(
  active: IView | null,
  viewSet: ViewSet,
  phase: string
): ShortcutEngine.ShortcutScope {
  if (!active) return "lobby";
  const globeViews = [viewSet.globeView, viewSet.sphereView];
  if (globeViews.includes(active as any)) return "globe";
  switch (phase) {
    case "gamein":
      return "game";
    default:
      return "lobby";
  }
}

function updateHUDVisibility(
  active: IView,
  viewSet: ViewSet,
  phase: string,
  lobby: LobbyView,
  hud: ActionHUD
) {
  if (active === viewSet.globeView) {
    lobby.hide();
    hud.hide();
  } else if (phase === "gamein") {
    hud.show();
    lobby.hide();
  } else {
    lobby.show();
    hud.hide();
  }
}

function syncUI(
  viewSet: ViewSet,
  lobby: LobbyView,
  hud: ActionHUD,
  gp: GameStateProvider | null,
  handlers: ShortcutEngine.HandlerMap,
  cleanup: ContextCleanup,
  pressedActions: Set<string>
): string {
  const active = viewSet.viewManager.getActiveView();
  const phase = gp?.phase || "lobby";
  updateHUDVisibility(active, viewSet, phase, lobby, hud);
  pressedActions.clear();
  if (cleanup.controller) cleanup.controller.abort();
  const scope = determineScope(active, viewSet, phase);
  cleanup.controller = ShortcutEngine.activateContext(
    scope, handlers
  );
  const isGlobe = active === viewSet.globeView ||
    active === viewSet.sphereView;
  return phase + ":" + (isGlobe ? "globe" : "local");
}

function startLobbyAutoJoin(
  lobby: LobbyView,
  getProvider: () => any
) {
  const params = new URLSearchParams(window.location.search);
  if (params.get("join") !== "false") {
    setTimeout(() => {
      if (!getProvider()) lobby.confirmSelection();
    }, 2000);
  }
}

function initMainLobbySectors(lobby: LobbyView) {
  lobby.renderSectorList([
    { id: "game:sector_alpha", name: "Sector Alpha (Dev)" },
    { id: "game:sector_beta", name: "Sector Beta (Test)" }
  ]);
}

function main() {
  const mainCanvas = document.getElementById(
    "main-canvas"
  ) as HTMLCanvasElement;
  if (!mainCanvas) return;
  const viewSet = initRenderPipeline(mainCanvas);
  bindDebugConsole(viewSet);

  let provider: GameStateProvider | null = null;
  let currentContextKey = "";
  const cleanup: ContextCleanup = { controller: null };
  const lobby = new LobbyView();
  const hud = new ActionHUD();
  const gsm = new GameStateManager();

  const performSync = () => {
    currentContextKey = syncUI(
      viewSet, lobby, hud, provider, inputMgr.handlers, cleanup,
      inputMgr.pressedActions
    );
  };

  const inputMgr = new InputManager(
    viewSet, () => provider, lobby, hud, performSync
  );
  const avatar = new AvatarController(
    viewSet.viewManager,
    () => provider,
    (act) => inputMgr.isActionPressed(act)
  );

  initMainLobbySectors(lobby);
  bindActionHUD(() => provider, gsm, avatar, hud);
  performSync();

  const onInit = (gs: any) => {
    ShortcutEngine.printHelp();
    gsm.handleInitState(gs, viewSet);
    if (gs.players && provider) {
      gsm.syncPlayers(gs.players, hud, provider);
      lobby.updatePlayerQueue(gs.players);
    }
    performSync();
    gsm.updateEntitiesList(
      viewSet.viewManager.getActiveView(), provider
    );
  };

  const onUpdate = (update: any) => {
    if (update.players && provider) {
      gsm.syncPlayers(update.players, hud, provider);
      if (provider.phase === "lobby") {
        lobby.updatePlayerQueue(update.players);
      }
    }
    if (update.fauna) {
      update.fauna.forEach(([id, x, _y, z]: any) =>
        gsm.faunaAnchors.set(id, new THREE.Vector3(x, 1, z))
      );
    }
    if (update.items) gsm.handleUpdateItems(update.items);
    const active = viewSet.viewManager.getActiveView();
    const isGlobe = active === viewSet.globeView ||
      active === viewSet.sphereView;
    const nextKey = (provider?.phase || "lobby") + ":" +
      (isGlobe ? "globe" : "local");
    if (nextKey !== currentContextKey) performSync();
  };

  lobby.onSectorSelect((sector) => {
    if (!provider) {
      provider = new GameStateProvider(
        sector.id, onInit, onUpdate
      );
      provider.start();
      runLoop();
    }
  });

  startLobbyAutoJoin(lobby, () => provider);
  inputMgr.bindMouseEvents(mainCanvas, avatar);

  function runLoop() {
    let timing = { lastTime: performance.now() };
    viewSet.viewManager.animate();
    const tick = () => {
      requestAnimationFrame(tick);
      if (provider?.phase === "lobby") return;
      const now = performance.now();
      const dt = (now - timing.lastTime) / 1000;
      timing.lastTime = now;

      const interp = gsm.updateFauna(dt);
      const active = viewSet.viewManager.getActiveView();
      const hData = gsm.getHUDData(avatar, inputMgr.mouse, active);
      hud.setNearbyItem(hData.nearbyItem);
      hud.setHoveredItem(hData.hoveredItem);

      avatar.update(dt);
      gsm.updateEntitiesList(active, provider, interp);
    };
    tick();
  }
}

window.addEventListener("DOMContentLoaded", main);
