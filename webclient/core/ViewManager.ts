import './global_types.ts';
import { EntityData, Terrain } from './types.ts';
import { LidarStyles } from '../render/LidarStyles.ts';
import { DEV_MODE_ENABLED } from '../env-config.ts';
import { ShortcutScope } from '../input/ShortcutConfig.ts';
import { LidarView } from '../view/LidarView.ts';
import { SphereView } from '../view/SphereView.ts';
import { GlobeView } from '../view/GlobeView.ts';

export interface IView {
  scene: any;
  camera: any;
  controls?: any;
  terrainMesh?: any;
  entropy?: number;
  currentStyleName?: string;
  diagEnabled?: boolean;
  update(deltaTime: number): void;
  updateEntities(
    entities: EntityData[],
    localPlayerId?: string,
  ): void;
  updateTerrain(terrain: Terrain): void;
  onActivate(): void;
  onDeactivate(): void;
  getInteractableObjects(): any[];
  raycastEnabled?: boolean;
  isGlobeView?: boolean;
  setDiagMode?(enabled: boolean): void;
  setLidarStyle?(styleName: string): void;
  rotate?(direction: string): void;
  dispose?(): void;
  preRender?(renderer: any): void;
}

export type ViewSet = {
  viewManager: ViewManager;
  lidarView: IView;
  sphereView: IView;
  globeView: IView;
};

export class ViewManager {
  private canvas: HTMLCanvasElement;
  private renderer: any;
  private activeView: IView | null = null;
  private clock = new THREE.Clock();
  private _lidarView: IView | null = null;
  private _sphereView: IView | null = null;
  private _globeView: IView | null = null;
  private resizeListener = () => this.onWindowResize();

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    window.addEventListener('resize', this.resizeListener);
  }

  public get lidarView(): IView | null {
    return this._lidarView;
  }

  public get sphereView(): IView | null {
    return this._sphereView;
  }

  public get globeView(): IView | null {
    return this._globeView;
  }

  public dispose(): void {
    window.removeEventListener('resize', this.resizeListener);
    this.renderer.dispose();
  }

  public initPipeline(): ViewSet {
    this._lidarView = new LidarView(this.canvas);
    this._sphereView = new SphereView(this.canvas);
    this._globeView = new GlobeView({}, this.canvas);
    this.setActiveView(this._lidarView);
    return {
      viewManager: this,
      lidarView: this._lidarView!,
      sphereView: this._sphereView!,
      globeView: this._globeView!,
    };
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

  private checkGlobeView(view: IView | null): boolean {
    if (!view) return false;
    const name = view.constructor?.name;
    return Boolean(
      view.isGlobeView ||
        name === 'GlobeView' ||
        name === 'SphereView',
    );
  }

  public getScope(phase: string): ShortcutScope {
    const active = this.getActiveView();
    if (!active) return 'lobby';
    if (this.checkGlobeView(active)) return 'globe';
    return phase === 'gamein' ? 'game' : 'lobby';
  }

  private applyHUDVisibility(
    isGlobe: boolean,
    isGameIn: boolean,
    lobby: { show(): void; hide(): void },
    hud: { show(): void; hide(): void },
  ): void {
    if (isGlobe) {
      lobby.hide();
      hud.hide();
      return;
    }
    if (isGameIn) {
      hud.show();
      lobby.hide();
      return;
    }
    lobby.show();
    hud.hide();
  }

  public updateHUDVisibility(
    phase: string,
    lobby: { show(): void; hide(): void },
    hud: { show(): void; hide(): void },
  ): void {
    const active = this.getActiveView();
    const isGlobe = this.checkGlobeView(active);
    this.applyHUDVisibility(
      isGlobe,
      phase === 'gamein',
      lobby,
      hud,
    );
  }

  public toggleView(
    lidarView: IView,
    sphereView: IView,
    globeView: IView,
  ): void {
    if (this.activeView === globeView) return;
    const next = this.activeView === lidarView
      ? sphereView
      : lidarView;
    this.setActiveView(next);
  }

  public toggleGlobe(
    lidarView: IView,
    globeView: IView,
  ): void {
    if (!DEV_MODE_ENABLED) return;
    const next = this.activeView === globeView
      ? lidarView
      : globeView;
    this.setActiveView(next);
  }

  public cycleStyle(lidarView: IView): void {
    if (this.activeView !== lidarView) return;
    const styles = Object.keys(LidarStyles);
    const cur = lidarView.currentStyleName || styles[0];
    const idx = (styles.indexOf(cur) + 1) % styles.length;
    lidarView.setLidarStyle?.(styles[idx]);
  }

  public rotate(
    dir: 'up' | 'down' | 'left' | 'right',
  ): void {
    if (this.activeView && 'rotate' in this.activeView) {
      this.activeView.rotate?.(dir);
    }
  }

  public adjustEntropy(lidarView: IView, delta: number): void {
    if (this.activeView === lidarView) {
      const cur = lidarView.entropy || 0;
      const val = delta < 0
        ? Math.max(0, cur + delta)
        : Math.min(1, cur + delta);
      lidarView.entropy = val;
    }
  }

  public toggleDiag(): void {
    if (this.activeView && 'setDiagMode' in this.activeView) {
      this.activeView.setDiagMode?.(!this.activeView.diagEnabled);
    }
  }

  private renderFrame(view: IView): void {
    const delta = this.clock.getDelta();
    view.update(delta);
    if (view.preRender) {
      view.preRender(this.renderer);
    }
    this.renderer.render(
      view.scene,
      view.camera,
    );
  }

  public animate(): void {
    requestAnimationFrame(() => this.animate());
    if (this.activeView) {
      this.renderFrame(this.activeView);
    }
  }

  private onWindowResize(): void {
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
}
