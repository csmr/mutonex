
import { THREE, OrbitControls } from "./deps.ts";
import { IView } from "./ViewManager.ts";

export class LidarView implements IView {
    public scene: THREE.Scene;
    public camera: THREE.PerspectiveCamera;
    private controls: OrbitControls;

    constructor(domElement: HTMLCanvasElement) {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x000000);

        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(0, 10, 0);
        this.camera.lookAt(this.scene.position);

        this.controls = new OrbitControls(this.camera, domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;

        this.createGroundPlane();
    }

    private createGroundPlane(): void {
        const vertices = [];
        const size = 200;
        const divisions = 10;

        for (let i = 0; i <= divisions; i++) {
            for (let j = 0; j <= divisions; j++) {
                const x = (i / divisions) * size - (size / 2);
                const z = (j / divisions) * size - (size / 2);
                vertices.push(x, 0, z);
            }
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));

        const material = new THREE.PointsMaterial({
            color: 0x00ff00, // green
            size: 0.3, // Corresponds to roughly 3px radius
            sizeAttenuation: true,
        });

        const points = new THREE.Points(geometry, material);
        this.scene.add(points);
    }

    public onActivate(): void {
        window.addEventListener('resize', this.onWindowResize.bind(this));
    }

    public onDeactivate(): void {
        window.removeEventListener('resize', this.onWindowResize.bind(this));
    }

    public update(_deltaTime: number): void {
        this.controls.update();
    }

    private onWindowResize(): void {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
    }
}
