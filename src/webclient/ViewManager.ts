import "./global_types.ts";
import { EntityData, Terrain } from "./types.ts";

// A simple interface that all views must adhere to.
export interface IView {
    scene: any; // THREE.Scene
    camera: any; // THREE.Camera
    controls?: any; // THREE.OrbitControls
    update(deltaTime: number): void;
    updateEntities(entities: EntityData[]): void;
    updateTerrain(terrain: Terrain): void;
    onActivate(): void;
    onDeactivate(): void;
    preRender?(renderer: any): void; // THREE.WebGLRenderer
}

/**
 * Manages the active view and the main render loop.
 */
export class ViewManager {
    private renderer: any; // THREE.WebGLRenderer
    private activeView: IView | null = null;
    private clock = new THREE.Clock();

    constructor(canvas: HTMLCanvasElement) {
        this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);

        window.addEventListener('resize', this.onWindowResize.bind(this));
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

    public animate(): void {
        requestAnimationFrame(this.animate.bind(this));

        if (this.activeView) {
            const deltaTime = this.clock.getDelta();
            this.activeView.update(deltaTime);
            if (this.activeView.preRender) {
                this.activeView.preRender(this.renderer);
            }
            this.renderer.render(this.activeView.scene, this.activeView.camera);
        }
    }

    private onWindowResize(): void {
        // The active view is responsible for updating its camera aspect ratio
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
}
