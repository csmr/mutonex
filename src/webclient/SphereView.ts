import "./global_types.ts";
import { IView } from "./ViewManager.ts";
import { createTerrainMesh } from "./TerrainMesh.ts";
import { EntityData, Terrain } from "./types.ts";

export class SphereView implements IView {
    public scene: any;
    public camera: any;
    public controls: any;

    private playerMeshes: Map<string, any> = new Map();
    private faunaMeshes: Map<string, any> = new Map();
    private boundResize: () => void;

    constructor(domElement: HTMLCanvasElement) {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xeeeeee);

        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(15, 20, 30);
        this.camera.lookAt(10, 0, 10);

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(50, 50, 50);
        this.scene.add(directionalLight);

        this.controls = new (window as any).THREE.OrbitControls(this.camera, domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.minDistance = 5;
        this.controls.maxDistance = 500;
        this.controls.maxPolarAngle = Math.PI / 2;
        this.boundResize =
            this.onWindowResize.bind(this);
    }

    public updateTerrain(terrain: Terrain): void {
        const mesh = createTerrainMesh(terrain);
        this.scene.add(mesh);
    }

    public updateEntities(entities: EntityData[]): void {
        const currentIds = new Set<string>();

        for (const ent of entities) {
            currentIds.add(ent.id);
            if (ent.type === 'player' || ent.type === 'building') { // buildings treated as static units for now
                this.updateMesh(this.playerMeshes, ent.id, ent.pos, 0xff0000, 0.5);
            } else if (ent.type === 'fauna') {
                this.updateMesh(this.faunaMeshes, ent.id, ent.pos, 0x00ff00, 0.3);
            }
        }

        // Cleanup
        this.cleanupMeshes(this.playerMeshes, currentIds);
        this.cleanupMeshes(this.faunaMeshes, currentIds);
    }

    private updateMesh(map: Map<string, any>, id: string, pos: any, color: number, size: number) {
        let mesh = map.get(id);
        if (!mesh) {
            const geometry = new THREE.SphereGeometry(size, 16, 16);
            const material = new THREE.MeshBasicMaterial({ color });
            mesh = new THREE.Mesh(geometry, material);
            this.scene.add(mesh);
            map.set(id, mesh);
        }
        mesh.position.copy(pos);
    }

    private cleanupMeshes(map: Map<string, any>, currentIds: Set<string>) {
        for (const [id, mesh] of map) {
            if (!currentIds.has(id)) {
                this.scene.remove(mesh);
                map.delete(id);
            }
        }
    }

    public update(deltaTime: number): void {
        this.controls.update();
    }

    public onActivate(): void {
        window.addEventListener(
            'resize', this.boundResize
        );
    }

    public onDeactivate(): void {
        window.removeEventListener(
            'resize', this.boundResize
        );
    }

    private onWindowResize(): void {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
    }
}
