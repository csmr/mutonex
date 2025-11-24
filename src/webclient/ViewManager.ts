import { THREE } from "./deps.ts";

// A simple interface that all views must adhere to.
export interface IView {
    scene: THREE.Scene;
    camera: THREE.Camera;
    update(deltaTime: number): void;
    onActivate(): void;
    onDeactivate(): void;
}

/**
 * Manages the active view and the main render loop.
 */
export class ViewManager {
    private renderer: THREE.WebGLRenderer;
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
            this.renderer.render(this.activeView.scene, this.activeView.camera);
        }
    }

    private onWindowResize(): void {
        // The active view is responsible for updating its camera aspect ratio
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
}
