import "./global_types.ts";
import { EntityData, Terrain } from "./types.ts";
import { LidarStyles } from "../render/LidarStyles.ts";
import { DEV_MODE_ENABLED } from "../env-config.ts";

export interface IView {
  scene: any;
  camera: any;
  controls?: any;
  terrainMesh?: any;
  update(deltaTime: number): void;
  updateEntities(
    entities: EntityData[],
    localPlayerId?: string
  ): void;
  updateTerrain(terrain: Terrain): void;
  onActivate(): void;
  onDeactivate(): void;
  getInteractableObjects(): any[];
  raycastEnabled?: boolean;
  isGlobeView?: boolean;
  setDiagMode?(enabled: boolean): void;
  rotate?(direction: string): void;
  dispose?(): void;
  preRender?(renderer: any): void;
}

export type ViewSet = {
  viewManager: ViewManager;
  lidarView: any;
  sphereView: any;
  globeView: any;
};

export class ViewManager {
  private renderer: any;
  private activeView: IView | null = null;
  private clock = new THREE.Clock();

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    window.addEventListener("resize", () => this.onWindowResize());
  }

  public setActiveView(view: IView): void {
    if (this.activeView) {
      this.activeView.onDeactivate();
    }
    this.activeView = view;
    this.activeView.onActivate();
  }

  public getActiveView(): IView | null {
    return this.activeView;
  }

  public toggleView(
    lidarView: IView,
    sphereView: IView,
    globeView: IView
  ): void {
    if (this.activeView === globeView) return;
    const next = this.activeView === lidarView
      ? sphereView
      : lidarView;
    this.setActiveView(next);
  }

  public toggleGlobe(
    lidarView: IView,
    globeView: IView
  ): void {
    if (!DEV_MODE_ENABLED) return;
    const next = this.activeView === globeView
      ? lidarView
      : globeView;
    this.setActiveView(next);
  }

  public cycleStyle(lidarView: any): void {
    if (this.activeView !== lidarView) return;
    const styles = Object.keys(LidarStyles);
    const cur = lidarView.currentStyleName;
    const idx = (styles.indexOf(cur) + 1) % styles.length;
    lidarView.setLidarStyle(styles[idx]);
  }

  public rotate(
    dir: "up" | "down" | "left" | "right"
  ): void {
    if (this.activeView && "rotate" in this.activeView) {
      this.activeView.rotate?.(dir);
    }
  }

  public adjustEntropy(lidarView: any, delta: number): void {
    if (this.activeView === lidarView) {
      const cur = lidarView.entropy;
      const val = delta < 0
        ? Math.max(0, cur + delta)
        : Math.min(1, cur + delta);
      lidarView.entropy = val;
    }
  }

  public toggleDiag(): void {
    if (this.activeView && "setDiagMode" in this.activeView) {
      const g = this.activeView as any;
      g.setDiagMode?.(!g.diagEnabled);
    }
  }

  public animate(): void {
    requestAnimationFrame(() => this.animate());
    if (this.activeView) {
      const delta = this.clock.getDelta();
      this.activeView.update(delta);
      if (this.activeView.preRender) {
        this.activeView.preRender(this.renderer);
      }
      this.renderer.render(
        this.activeView.scene,
        this.activeView.camera
      );
    }
  }

  private onWindowResize(): void {
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
}
