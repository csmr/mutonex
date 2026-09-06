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
import type {
  PlayerTuple,
} from '../mocks/MockGameStateProvider.ts';

const AUTO_JOIN_DELAY_MS = 2000;
const LOBBY_SECTORS = [
  { id: 'game:sector_alpha', name: 'Sector Alpha (Dev)' },
  { id: 'game:sector_beta', name: 'Sector Beta (Test)' },
];

interface GameInitData {
  players?: PlayerTuple[];
  fauna?: any[];
  terrain?: any;
  minerals?: any[];
}

interface GameUpdateData {
  players?: PlayerTuple[];
  fauna?: any[];
  items?: any[];
}

type MutonexWindow = Window & typeof globalThis & {
  __mutonex?: any;
};

function initRenderPipeline(canvas: HTMLCanvasElement): ViewSet {
  return new ViewManager(canvas).initPipeline();
}

function bindDebugConsole(viewSet: ViewSet) {
  const { lidarView, viewManager } = viewSet;
  const win = window as MutonexWindow;
  win.__mutonex = {
    lidarView,
    viewManager,
    renderer: (viewManager as any).renderer,
  };
  win.__mutonex.lidarView.setStyle = (
    styleName: string,
  ) => {
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

function handleInit(
  { players, fauna, terrain, minerals }: GameInitData,
  viewSet: ViewSet,
  gsm: GameStateManager,
  hud: ActionHUD,
  provider: GameStateProvider | null,
  lobby: LobbyView,
  performSync: () => void,
): void {
  ShortcutEngine.printHelp();
  gsm.handleInitState({ fauna, terrain, minerals }, viewSet);
  if (players?.length && provider) {
    gsm.syncPlayers(players, hud, provider);
    lobby.updatePlayerQueue(players);
  }
  performSync();
  gsm.updateEntitiesList(
    viewSet.viewManager.getActiveView(),
    provider,
  );
}

function handleUpdate(
  { players, fauna, items }: GameUpdateData,
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
  if (items?.length) gsm.handleUpdateItems(items);
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
  const interp = gsm.updateFauna(dt);
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
  bindDebugConsole(viewSet);

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

  lobby.renderSectorList(LOBBY_SECTORS);
  gameStateManager.bindActionHUD(hud, avatar, () => provider);
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
  );

  startLobbyAutoJoin(lobby, () => provider);
  inputMgr.bindMouseEvents(canvas, avatar);
}

window.addEventListener('DOMContentLoaded', main);
