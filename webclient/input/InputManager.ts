// webclient/input/InputManager.ts
import "../core/global_types.ts";
import { GameStateProvider } from "../core/GameStateProvider.ts";
import { ViewSet } from "../core/ViewManager.ts";
import { LobbyView } from "../view/LobbyView.ts";
import { ActionHUD } from "../view/ActionHUD.ts";
import { AvatarController } from "./AvatarController.ts";
import * as ShortcutEngine from "./ShortcutEngine.ts";
import { ShortcutEntry } from "./ShortcutConfig.ts";

export class InputManager {
  public pressedActions = new Set<string>();
  public handlers: ShortcutEngine.HandlerMap = new Map();
  public mouse = new THREE.Vector2();

  constructor(
    private viewSet: ViewSet,
    private getProvider: () => GameStateProvider | null,
    private lobby: LobbyView,
    private hud: ActionHUD,
    private sync: () => void
  ) {
    this.setupShortcuts();
  }

  public isActionPressed(act: string): boolean {
    return this.pressedActions.has(act);
  }

  private setupShortcuts() {
    let h = this.handlers;
    h = this.registerDiscrete(h);
    h = this.registerNavAndDiag(h);
    h = this.registerRotation(h);
    h = this.registerMove(h);
    this.handlers = h;
  }

  private handleEvent(
    event: KeyboardEvent,
    entry: ShortcutEntry,
    callback: () => void
  ): void {
    if (
      entry.eventType === "both" ||
      event.type === entry.eventType
    ) {
      callback();
    }
  }

  private registerDiscrete(
    hMap: ShortcutEngine.HandlerMap
  ): ShortcutEngine.HandlerMap {
    let h = hMap;
    const vm = this.viewSet.viewManager;
    const { lidarView, sphereView, globeView } = this.viewSet;
    h = ShortcutEngine.registerHandler(
      h, "toggle_view", (e, ev) =>
        this.handleEvent(
          ev, e, () => {
            vm.toggleView(lidarView, sphereView, globeView);
            this.sync();
          }
        )
    );
    h = ShortcutEngine.registerHandler(
      h, "toggle_globe", (e, ev) =>
        this.handleEvent(
          ev, e, () => {
            vm.toggleGlobe(lidarView, globeView);
            this.sync();
          }
        )
    );
    h = ShortcutEngine.registerHandler(h, "cycle_style", (e, ev) =>
      this.handleEvent(
        ev, e, () => vm.cycleStyle(lidarView)
      )
    );
    h = ShortcutEngine.registerHandler(h, "dec_entropy", (e, ev) =>
      this.handleEvent(
        ev, e, () => vm.adjustEntropy(lidarView, -0.1)
      )
    );
    h = ShortcutEngine.registerHandler(h, "inc_entropy", (e, ev) =>
      this.handleEvent(
        ev, e, () => vm.adjustEntropy(lidarView, 0.1)
      )
    );
    return h;
  }

  private handleLobbyAction(act: "prev" | "next" | "join"): void {
    const provider = this.getProvider();
    if (act === "prev" && provider?.phase === "lobby") {
      this.lobby.navigate(-1);
    } else if (act === "next" && provider?.phase === "lobby") {
      this.lobby.navigate(1);
    } else if (
      act === "join" && (!provider || provider.phase === "lobby")
    ) {
      this.lobby.confirmSelection();
    }
  }

  private registerNavAndDiag(
    hMap: ShortcutEngine.HandlerMap
  ): ShortcutEngine.HandlerMap {
    let h = hMap;
    const vm = this.viewSet.viewManager;
    h = ShortcutEngine.registerHandler(h, "lobby_prev", (e, ev) =>
      this.handleEvent(ev, e, () => this.handleLobbyAction("prev"))
    );
    h = ShortcutEngine.registerHandler(h, "lobby_next", (e, ev) =>
      this.handleEvent(ev, e, () => this.handleLobbyAction("next"))
    );
    h = ShortcutEngine.registerHandler(h, "lobby_join", (e, ev) =>
      this.handleEvent(ev, e, () => this.handleLobbyAction("join"))
    );
    h = ShortcutEngine.registerHandler(h, "toggle_diag", (e, ev) =>
      this.handleEvent(ev, e, () => vm.toggleDiag())
    );
    return h;
  }

  private registerRotation(
    hMap: ShortcutEngine.HandlerMap
  ): ShortcutEngine.HandlerMap {
    let h = hMap;
    const vm = this.viewSet.viewManager;
    const dirs: Array<"up" | "down" | "left" | "right"> = [
      "up", "down", "left", "right"
    ];
    dirs.forEach((dir) => {
      h = ShortcutEngine.registerHandler(
        h, `rot_${dir}`, (_e, ev) => {
          if (ev.type === "keydown") vm.rotate(dir);
        }
      );
    });
    return h;
  }

  private registerMove(
    hMap: ShortcutEngine.HandlerMap
  ): ShortcutEngine.HandlerMap {
    let h = hMap;
    const moves = [
      "move_fwd", "move_back", "move_left", "move_right"
    ];
    moves.forEach((act) => {
      h = ShortcutEngine.registerHandler(h, act, (_, ev) => {
        if (ev.type === "keydown") this.pressedActions.add(act);
        else this.pressedActions.delete(act);
      });
    });
    return h;
  }

  public bindMouseEvents(
    canvas: HTMLCanvasElement,
    avatar: AvatarController
  ): void {
    window.addEventListener("mousemove", (e) => {
      this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    });
    canvas.addEventListener("click", () =>
      this.handleCanvasClick(avatar)
    );
  }

  private handleCanvasClick(avatar: AvatarController): void {
    const provider = this.getProvider();
    const cur = this.viewSet.viewManager.getActiveView();
    if (!cur || !provider || !cur.raycastEnabled) return;
    const rc = new THREE.Raycaster();
    rc.setFromCamera(this.mouse, cur.camera);
    const hits = rc.intersectObjects(
      cur.getInteractableObjects(), true
    );
    for (const h of hits) {
      const d = h.object.userData;
      const isItem = d?.entityId &&
        (d.entityType as string).startsWith("item");
      if (isItem) {
        if (avatar.position.distanceTo(h.point) <= 15.0) {
          provider.sendPlayerAction("pick_up", d.entityId);
        }
        break;
      }
    }
  }
}
