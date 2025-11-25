import { IView } from "./ViewManager.ts";
import { GameState, Unit } from "./MockGameStateProvider.ts";

const GLOBE_RADIUS = 5;
const UNIT_RADIUS = 0.05;

declare const THREE: typeof import("three");
declare const OrbitControls: typeof import("three/examples/jsm/controls/OrbitControls");

/**
 * Manages the 3D globe view and its interactions.
 */
export class GlobeView implements IView {
    public scene: THREE.Scene;
    public camera: THREE.PerspectiveCamera;

    private controls: THREE.OrbitControls;
    private globe: THREE.Group;
    private unitMeshes: Record<string, THREE.Mesh> = {};
    private sectorMeshes: Record<string, THREE.Mesh> = {};
    private playerColors: Record<string, THREE.Color> = {
        'Player1': new THREE.Color(0x00ff00), // Green
        'Player2': new THREE.Color(0xff00ff), // Magenta
    };

    constructor(geoData: any, domElement: HTMLCanvasElement) {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x000000);

        this.camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.z = 15;

        // Controls
        this.controls = new THREE.OrbitControls(this.camera, domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.enablePan = false;
        this.controls.minDistance = 7;
        this.controls.maxDistance = 30;
        this.controls.autoRotate = true;
        this.controls.autoRotateSpeed = 0.2;

        // Group to hold the globe and its features
        this.globe = new THREE.Group();
        this.scene.add(this.globe);

        // Create the base sphere
        const sphereGeometry = new THREE.SphereGeometry(GLOBE_RADIUS, 32, 32);
        const sphereMaterial = new THREE.MeshBasicMaterial({ color: 0x0a0a0a });
        const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
        this.globe.add(sphere);

        this.#drawFeatures(geoData.features);
        this.#drawGrid();
    }

    public onActivate(): void {
        window.addEventListener('resize', this.onWindowResize.bind(this));
        window.addEventListener('keydown', this.onKeyDown.bind(this));
    }

    public onDeactivate(): void {
        window.removeEventListener('resize', this.onWindowResize.bind(this));
        window.removeEventListener('keydown', this.onKeyDown.bind(this));
    }

    public update(_deltaTime: number): void {
        this.controls.update();
    }

    public updateGameState(state: GameState): void {
        this.#updateUnits(state.units);
        this.#updateSectors(state.sectors);
    }

    #updateSectors(sectors: Record<string, any>): void {
        Object.values(sectors).forEach(sector => {
            // Sector ID is "lat_10_lon_30", parse it
            const parts = sector.id.split('_');
            const lat = parseInt(parts[1]);
            const lon = parseInt(parts[3]);

            if (this.sectorMeshes[sector.id]) {
                // Sector exists, update color
                const color = this.playerColors[sector.owner] || 0xdddddd;
                (this.sectorMeshes[sector.id].material as THREE.MeshBasicMaterial).color.set(color);
            } else {
                // Sector is new, create mesh
                const color = this.playerColors[sector.owner] || 0xdddddd;
                const geometry = new THREE.BoxGeometry(0.5, 0.5, 0.1);
                const material = new THREE.MeshBasicMaterial({
                    color,
                    transparent: true,
                    opacity: 0.5
                });
                const mesh = new THREE.Mesh(geometry, material);
                // Place it on the surface of the globe
                const position = this.lonLatToVector3(lon, lat, GLOBE_RADIUS);
                mesh.position.copy(position);
                // Orient it to be flat on the surface
                mesh.lookAt(this.globe.position);

                this.sectorMeshes[sector.id] = mesh;
                this.globe.add(mesh);
            }
        });
    }

    #updateUnits(units: Unit[]): void {
        const currentUnitIds = new Set(units.map(u => u.id));

        // Update existing units and add new ones
        units.forEach(unit => {
            const position = this.lonLatToVector3(unit.lon, unit.lat, GLOBE_RADIUS + UNIT_RADIUS);
            if (this.unitMeshes[unit.id]) {
                // Unit exists, update position
                this.unitMeshes[unit.id].position.copy(position);
            } else {
                // Unit is new, create mesh
                const color = this.playerColors[unit.owner] || 0xffffff;
                const geometry = new THREE.SphereGeometry(UNIT_RADIUS, 16, 16);
                const material = new THREE.MeshBasicMaterial({ color });
                const mesh = new THREE.Mesh(geometry, material);
                mesh.position.copy(position);
                this.unitMeshes[unit.id] = mesh;
                this.globe.add(mesh);
            }
        });

        // Remove old units that are no longer in the state
        Object.keys(this.unitMeshes).forEach(unitId => {
            if (!currentUnitIds.has(unitId)) {
                const mesh = this.unitMeshes[unitId];
                this.globe.remove(mesh);
                delete this.unitMeshes[unitId];
            }
        });
    }

    private onWindowResize(): void {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
    }

    private onKeyDown(event: KeyboardEvent): void {
        if (this.controls.autoRotate) {
            this.controls.autoRotate = false;
        }
        const rotationSpeed = 0.05;
        switch (event.key) {
            case 'ArrowUp': this.globe.rotation.x -= rotationSpeed; break;
            case 'ArrowDown': this.globe.rotation.x += rotationSpeed; break;
            case 'ArrowLeft': this.globe.rotation.y -= rotationSpeed; break;
            case 'ArrowRight': this.globe.rotation.y += rotationSpeed; break;
        }
    }

    private lonLatToVector3(lon: number, lat: number, radius: number): THREE.Vector3 {
        const phi = (90 - lat) * (Math.PI / 180);
        const theta = (lon + 180) * (Math.PI / 180);
        const x = -(radius * Math.sin(phi) * Math.cos(theta));
        const y = radius * Math.cos(phi);
        const z = radius * Math.sin(phi) * Math.sin(theta);
        return new THREE.Vector3(x, y, z);
    }

    #drawFeatures(features: any[]): void {
        const material = new THREE.LineBasicMaterial({ color: 0xff6600 });
        features.forEach(feature => {
            const geom = feature.geometry;
            if (geom.type === 'Polygon') {
                this.#drawPolygon(geom.coordinates, material);
            } else if (geom.type === 'MultiPolygon') {
                geom.coordinates.forEach((polygon: any) => this.#drawPolygon(polygon, material));
            }
        });
    }

    #drawPolygon(coords: number[][][], material: THREE.LineBasicMaterial): void {
        const points: THREE.Vector3[] = [];
        coords[0].forEach(p => points.push(this.lonLatToVector3(p[0], p[1], GLOBE_RADIUS)));
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const line = new THREE.Line(geometry, material);
        this.globe.add(line);
    }

    #drawGrid(): void {
        const gridMaterial = new THREE.LineBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.1,
        });

        // Draw latitude lines
        for (let lat = -80; lat <= 80; lat += 10) {
            const points = [];
            for (let lon = -180; lon <= 180; lon += 5) {
                points.push(this.lonLatToVector3(lon, lat, GLOBE_RADIUS));
            }
            const geometry = new THREE.BufferGeometry().setFromPoints(points);
            const line = new THREE.Line(geometry, gridMaterial);
            this.globe.add(line);
        }

        // Draw longitude lines
        for (let lon = -180; lon < 180; lon += 10) {
            const points = [];
            for (let lat = -90; lat <= 90; lat += 5) {
                points.push(this.lonLatToVector3(lon, lat, GLOBE_RADIUS));
            }
            const geometry = new THREE.BufferGeometry().setFromPoints(points);
            const line = new THREE.Line(geometry, gridMaterial);
            this.globe.add(line);
        }
    }
}
