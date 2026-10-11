// webclient/core/main.ts
import './global_types.ts';
import { GameStateProvider } from './GameStateProvider.ts';
import { ViewManager, ViewSet } from './ViewManager.ts';
import { LidarStyles } from '../render/LidarStyles.ts';
import { LobbyView } from '../view/LobbyView.ts';
import { AvatarController } from '../input/AvatarController.ts';
import { ActionHUD } from '../view/ActionHUD.ts';
import * as ShortcutEngine from '../input/ShortcutEngine.ts';
import { GameStateManager } from './GameStateManager.ts';
import { InputManager } from '../input/InputManager.ts';
import { Rules, store, updateRules } from './GameRules.ts';
import type {
  PlayerTuple,
} from '../mocks/MockGameStateProvider.ts';

type RulesStore = ReturnType<typeof store>;

const AUTO_JOIN_DELAY_MS = 2000;
const LOBBY_SECTORS = [
  { id: 'game:sector_alpha', name: 'Sector Alpha (Dev)' },
  { id: 'game:sector_beta', name: 'Sector Beta (Test)' },
  { id: 'game:sector_test', name: 'Test Sector (All Entities)' },
];

interface GameInitData {
  players?: PlayerTuple[];
  fauna?: any[];
  terrain?: any;
  minerals?: any[];
  items?: any[];
  buildings?: any[];
}

interface GameUpdateData {
  players?: PlayerTuple[];
  fauna?: any[];
  items?: any[];
  buildings?: any[];
}

type MutonexWindow = Window & typeof globalThis & {
  __mutonex?: any;
};

function initRenderPipeline(canvas: HTMLCanvasElement): ViewSet {
  return new ViewManager(canvas).initPipeline();
}

function attachGlobals(
  viewSet: ViewSet,
  rulesStore: RulesStore,
): void {
  const { lidarView, viewManager, turnTimer } = viewSet;
  const win = window as MutonexWindow;
  win.__mutonex = {
    lidarView,
    viewManager,
    turnTimer,
    gameRules: rulesStore,
    renderer: (viewManager as any).renderer,
    startTimer: (d?: number) => turnTimer.startTimer(d),
    updateRules: (p: Partial<Rules>) =>
      rulesStore.dispatch(updateRules(p)),
  };
}

function bindDebugConsole(
  viewSet: ViewSet,
  rulesStore: RulesStore,
): void {
  attachGlobals(viewSet, rulesStore);
  const { lidarView } = viewSet;
  const win = window as MutonexWindow;
  win.__mutonex.lidarView.setStyle = (styleName: string) => {
    if (LidarStyles[styleName]) lidarView.setLidarStyle(styleName);
  };
  ShortcutEngine.printHelp();
}

function startLobbyAutoJoin(
  lobby: LobbyView,
  getProvider: () => GameStateProvider | null,
) {
  const params = new URLSearchParams(window.location.search);
  if (params.get('join') !== 'false') {
    setTimeout(
      () => !getProvider() && lobby.confirmSelection(),
      AUTO_JOIN_DELAY_MS,
    );
  }
}

function syncInitialPlayers(
  players: PlayerTuple[] | undefined,
  gsm: GameStateManager,
  hud: ActionHUD,
  provider: GameStateProvider | null,
  lobby: LobbyView,
): void {
  if (players?.length && provider) {
    gsm.syncPlayers(players, hud, provider);
    lobby.updatePlayerQueue(players);
  }
}

function handleInit(
  { players, fauna, terrain, minerals, items, buildings }:
    GameInitData,
  viewSet: ViewSet,
  gsm: GameStateManager,
  hud: ActionHUD,
  provider: GameStateProvider | null,
  lobby: LobbyView,
  performSync: () => void,
  rulesStore: RulesStore,
): void {
  ShortcutEngine.printHelp();
  viewSet.turnTimer?.setRules(rulesStore.get());
  viewSet.turnTimer?.startTimer();
  gsm.handleInitState(
    { fauna, terrain, minerals, items, buildings },
    viewSet,
  );
  syncInitialPlayers(players, gsm, hud, provider, lobby);
  performSync();
  gsm.updateEntitiesList(
    viewSet.viewManager.getActiveView(),
    provider,
  );
}

function handleUpdate(
  { players, fauna, items, buildings }: GameUpdateData,
  gsm: GameStateManager,
  hud: ActionHUD,
  provider: GameStateProvider | null,
  lobby: LobbyView,
): void {
  if (!provider) return;
  if (players?.length) {
    gsm.syncPlayers(players, hud, provider);
    if (provider.phase === 'lobby') {
      lobby.updatePlayerQueue(players);
    }
  }
  fauna?.forEach(([id, x, _y, z]) =>
    gsm.faunaAnchors.set(id, new THREE.Vector3(x, 1, z))
  );
  if (items) gsm.handleUpdateItems(items);
  if (buildings?.length) gsm.handleUpdateBuildings(buildings);
}

function runLoopTick(
  viewSet: ViewSet,
  gsm: GameStateManager,
  avatar: AvatarController,
  hud: ActionHUD,
  inputMgr: InputManager,
  provider: GameStateProvider | null,
  dt: number,
): void {
  const interp = gsm.updateFauna(dt, avatar.position);
  const active = viewSet.viewManager.getActiveView();
  const { nearbyItem, hoveredItem } = gsm.getHUDData(
    avatar,
    inputMgr.mouse,
    active,
  );
  hud.setNearbyItem(nearbyItem);
  hud.setHoveredItem(hoveredItem);
  avatar.update(dt);
  gsm.updateEntitiesList(active, provider, interp);
}

function runLoop(
  viewSet: ViewSet,
  gsm: GameStateManager,
  avatar: AvatarController,
  hud: ActionHUD,
  inputMgr: InputManager,
  getProvider: () => GameStateProvider | null,
): void {
  let lastTime = performance.now();
  viewSet.viewManager.animate();
  const tick = () => {
    requestAnimationFrame(tick);
    const p = getProvider();
    if (p?.phase === 'lobby') return;
    const now = performance.now();
    const dt = (now - lastTime) / 1000;
    lastTime = now;
    runLoopTick(
      viewSet,
      gsm,
      avatar,
      hud,
      inputMgr,
      p,
      dt,
    );
  };
  tick();
}

function bindSectorSelect(
  lobby: LobbyView,
  viewSet: ViewSet,
  gsm: GameStateManager,
  hud: ActionHUD,
  inputMgr: InputManager,
  avatar: AvatarController,
  performSync: () => void,
  getProvider: () => GameStateProvider | null,
  setProvider: (p: GameStateProvider) => void,
  rulesStore: RulesStore,
): void {
  lobby.onSectorSelect((sector) => {
    if (getProvider()) return;
    const onInit = (gs: GameInitData) =>
      handleInit(
        gs,
        viewSet,
        gsm,
        hud,
        getProvider(),
        lobby,
        performSync,
        rulesStore,
      );
    const onUpdate = (update: GameUpdateData) => {
      handleUpdate(update, gsm, hud, getProvider(), lobby);
      performSync();
    };
    const provider = new GameStateProvider(
      sector.id,
      onInit,
      onUpdate,
    );
    provider.start();
    setProvider(provider);
    runLoop(viewSet, gsm, avatar, hud, inputMgr, getProvider);
  });
}

function main() {
  const canvas = document.getElementById(
    'main-canvas',
  ) as HTMLCanvasElement;
  if (!canvas) return;
  const viewSet = initRenderPipeline(canvas);
  const rulesStore = store();
  rulesStore.sub((rules) => {
    viewSet.turnTimer.setRules(rules);
  });
  bindDebugConsole(viewSet, rulesStore);

  let provider: GameStateProvider | null = null;
  const lobby = new LobbyView();
  const hud = new ActionHUD();
  const gameStateManager = new GameStateManager();

  const performSync = () => {
    inputMgr.syncUI(viewSet.viewManager, provider);
  };

  const inputMgr = new InputManager(
    viewSet,
    () => provider,
    lobby,
    hud,
    performSync,
  );
  const avatar = new AvatarController(
    viewSet.viewManager,
    () => provider,
    (act) => inputMgr.isActionPressed(act),
  );
  avatar.getObstacles = () =>
    gameStateManager.getObstacles(provider?.playerId);

  lobby.renderSectorList(LOBBY_SECTORS);
  gameStateManager.bindActionHUD(hud, avatar, () => provider);
  viewSet.turnTimer.setRules(rulesStore.get());
  viewSet.turnTimer.startTimer();
  performSync();

  bindSectorSelect(
    lobby,
    viewSet,
    gameStateManager,
    hud,
    inputMgr,
    avatar,
    performSync,
    () => provider,
    (p) => {
      provider = p;
    },
    rulesStore,
  );

  startLobbyAutoJoin(lobby, () => provider);
  inputMgr.bindMouseEvents(canvas, avatar);
}

window.addEventListener('DOMContentLoaded', main);
