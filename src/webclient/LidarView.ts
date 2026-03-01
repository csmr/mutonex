import "./global_types.ts";
import { IView } from "./ViewManager.ts";
import {
    EntityData,
    EntityType,
    Terrain
} from "./types.ts";
import { LidarVertexShader, LidarFragmentShader } from "./LidarShaders.ts";

export interface LidarStyleConfig {
    name: string;
    scanMode: number;
    dotType: number;
    samplesH: number;
    samplesV: number;
    dotRadiusMin: number;
    dotRadiusMax: number;
}

export const LidarStyles: Record<string, LidarStyleConfig> = {
    pointCloud: {
        name: 'pointCloud',
        scanMode: 1.0,
        dotType: 1.0,
        samplesH: 480,
        samplesV: 300,
        dotRadiusMin: 1.0,
        dotRadiusMax: 4.0,
    },
    lineLidar: {
        name: 'lineLidar',
        scanMode: 0.0,
        dotType: 1.0,
        samplesH: 800,
        samplesV: 560, // Task 3: dynamic high resolution vertical mode
        dotRadiusMin: 1.0,
        dotRadiusMax: 4.0,
    },
    legacy: {
        name: 'legacy',
        scanMode: 1.0,
        dotType: 0.0,
        samplesH: 400,
        samplesV: 280,
        dotRadiusMin: 1.0,
        dotRadiusMax: 4.0,
    }
};

export class LidarView implements IView {
    public scene: any; // THREE.Scene
    public camera: any; // THREE.PerspectiveCamera

    // Dot Rendering Parameters
    public currentStyleName: string = 'pointCloud';
    public dotRadiusMin = 1.0; // Radius for objects far away (vDist >= 30.0)
    public dotRadiusMax = 4.0; // Radius for objects very close (vDist == 0.0)
    public dotType = 1.0;   // 0.0 = square, 1.0 = circular

    private samplesH = 480;
    private samplesV = 300;
    public entropy: number = 0.1; // Parametric signal loss (0=no noise, 1=max)

    // The "Virtual" scene contains the actual geometry
    private virtualScene: any; // THREE.Scene
    private virtualMeshes: Map<string, any> = new Map();

    private renderTarget: any;
    private linearDepthMaterial: any;

    public controls: any;
    private renderer: any | null = null;
    private boundResize: () => void;

    private loader: any;
    private lidarMaterial: any;
    private lidarPoints: any;

    private geometryCache: Map<string, any> = new Map();
    private isRebuildingBuffer = false;
    private pendingStyleConfig: string | null = null;

    constructor(domElement: HTMLCanvasElement) {
        this.initMainScene(domElement);
        this.initVirtualScene();
        this.initRenderTarget();

        this.lidarMaterial = this.createLidarShader();
        this.createGroundGrid();
        this.startBufferRebuild(LidarStyles.pointCloud);

        this.loader = new THREE.BufferGeometryLoader();
        this.boundResize = this.onWindowResize.bind(this);
    }

    private initMainScene(domElement: HTMLCanvasElement) {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x050100);

        const w = window.innerWidth;
        const h = window.innerHeight;
        this.camera = new THREE.PerspectiveCamera(75, w / h, 0.1, 1000);

        // Camera at (0,8,20), looks ~22° below horizontal.
        // Ground fills lower screen without interaction.
        this.camera.position.set(0, 8, 20);

        const THREE_ANY = (window as any).THREE;
        this.controls = new THREE_ANY.OrbitControls(this.camera, domElement);
        this.controls.enableDamping = true;
        this.controls.autoRotate = false; // Deterministic default view.
    }

    private initVirtualScene() {
        this.virtualScene = new THREE.Scene();
        this.virtualScene.background = new THREE.Color(0x000000);

        // TEST SPHERE: Remove after terrain rendering confirmed.
        const debugGeo = new THREE.SphereGeometry(1.5, 16, 16);
        const debugMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const debugMesh = new THREE.Mesh(debugGeo, debugMat);
        debugMesh.position.set(0, 1.5, 10);
        this.virtualScene.add(debugMesh);
    }

    private initRenderTarget() {
        const w = window.innerWidth;
        const h = window.innerHeight;

        // FloatType allows full-precision linear depth in R channel.
        this.renderTarget = new THREE.WebGLRenderTarget(w, h, {
            minFilter: THREE.NearestFilter,
            magFilter: THREE.NearestFilter,
            format: THREE.RGBAFormat,
            type: THREE.FloatType,
        });

        // Linear depth material: writes z_view / cameraFar 
        // into R channel as a full 32-bit float.
        // z_view is positive view-space depth (-Z axis).
        // Sky cleared to white (1.0) for vertex discard.
        this.linearDepthMaterial = new THREE.ShaderMaterial({
            uniforms: { far: { value: this.camera.far } },
            vertexShader: `
                varying float vViewZ;
                void main() {
                    vec4 vPos = modelViewMatrix * vec4(position, 1.0);
                    vViewZ = -vPos.z; 
                    gl_Position = projectionMatrix * vPos;
                }
            `,
            fragmentShader: `
                uniform float far;
                varying float vViewZ;
                void main() {
                    gl_FragColor = vec4(vViewZ / far, 0.0, 0.0, 1.0);
                }
            `,
        });

    }

    public setLidarStyle(styleName: string) {
        const config = LidarStyles[styleName] || LidarStyles.pointCloud;
        this.currentStyleName = styleName;

        // Task 3: Dynamic Resolution
        this.samplesH = config.samplesH;
        this.samplesV = config.samplesV;

        this.dotType = config.dotType;
        this.dotRadiusMin = config.dotRadiusMin;
        this.dotRadiusMax = config.dotRadiusMax;

        if (this.lidarMaterial) {
            this.lidarMaterial.uniforms.scanMode.value = config.scanMode;
            this.lidarMaterial.uniforms.dotType.value = this.dotType;
            this.lidarMaterial.uniforms.dotRadiusMin.value = this.dotRadiusMin;
            this.lidarMaterial.uniforms.dotRadiusMax.value = this.dotRadiusMax;
        }

        if (this.isRebuildingBuffer) {
            this.pendingStyleConfig = styleName;
        } else {
            this.startBufferRebuild(config);
        }
    }

    private startBufferRebuild(config: LidarStyleConfig) {
        this.isRebuildingBuffer = true;
        this.pendingStyleConfig = null;

        // Execute chunk generator across frames
        const gen = this.chunkedGeometryGenerator(config.samplesH, config.samplesV);
        const processChunk = () => {
            const result = gen.next();
            if (!result.done) {
                requestAnimationFrame(processChunk);
            } else {
                this.isRebuildingBuffer = false;

                // Double Buffering Swap: Install new Points, dispose old Points
                if (this.lidarPoints) {
                    this.scene.remove(this.lidarPoints);
                    this.lidarPoints.geometry.dispose();
                }

                this.lidarPoints = result.value as any; // THREE.Points
                this.scene.add(this.lidarPoints);

                // If another request queued while we were building, start again
                if (this.pendingStyleConfig) {
                    this.setLidarStyle(this.pendingStyleConfig);
                }
            }
        };
        requestAnimationFrame(processChunk);
    }

    private *chunkedGeometryGenerator(samplesH: number, samplesV: number): Generator<void, any, void> {
        const geometry = new THREE.BufferGeometry();
        const totalPoints = samplesH * samplesV;
        const positions = new Float32Array(totalPoints * 3);
        const uvs = new Float32Array(totalPoints * 2);

        const chunkSize = 50000;
        let currentIdx = 0;

        for (let y = 0; y < samplesV; y++) {
            for (let x = 0; x < samplesH; x++) {
                // positions default to 0,0,0
                uvs[currentIdx * 2] = x / (samplesH - 1);
                uvs[currentIdx * 2 + 1] = y / (samplesV - 1);
                currentIdx++;

                if (currentIdx % chunkSize === 0) {
                    yield; // Yield control back to main thread
                }
            }
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));

        const newPoints = new THREE.Points(geometry, this.lidarMaterial);
        newPoints.frustumCulled = false;

        return newPoints;
    }

    private createLidarShader(): any {
        const resolution = new THREE.Vector2(
            window.innerWidth,
            window.innerHeight
        );

        const uniforms = {
            tDepth: { value: null },
            cameraNear: { value: 0.1 },
            cameraFar: { value: 1000.0 },
            viewInverse: { value: new THREE.Matrix4() },
            projectionInverse: {
                value: new THREE.Matrix4()
            },
            resolution: { value: resolution },
            time: { value: 0 },
            scanMode: { value: LidarStyles[this.currentStyleName]?.scanMode ?? 1.0 },
            entropy: { value: this.entropy },
            // diagMode: 0.0 = normal rendering, 1.0 = diagnostic (red=elevated, blue=ground).
            // Toggle from browser console: lidarView.lidarMaterial.uniforms.diagMode.value = 1.0
            diagMode: { value: 0.0 },
            dotType: { value: this.dotType },
            dotRadiusMin: { value: this.dotRadiusMin },
            dotRadiusMax: { value: this.dotRadiusMax }
        };

        return new THREE.ShaderMaterial({
            uniforms: uniforms,
            vertexShader: LidarVertexShader,
            fragmentShader: LidarFragmentShader,
            transparent: true,
            depthWrite: false, // Task 6: Disable depthWrite to fix occlusion sorting with AdditiveBlending
            blending: THREE.AdditiveBlending
        });
    }

    public updateTerrain(terrain: Terrain): void {
        // Placeholder
    }

    public updateEntities(entities: EntityData[]) {
        const charMap: { [key in EntityType]: string[] } = {
            'player': ['🧙', '𐇑', '𐇒'],
            'fauna': ['🦗', '🌱', '🌲'],
            'unit': ['👷', '🤖', '🧕'],
            'building': ['🏛'],
            'society': ['🎪', '🏘', '🏙'],
            'mineral': ['⭓', '⬠', '💎']
        };

        const activeIds = new Set<string>();

        for (const entity of entities) {
            activeIds.add(entity.id);

            const chars = charMap[entity.type] || ['?'];
            const idLen = entity.id.length;
            const charIdx = entity.id.charCodeAt(idLen - 1);
            const char = chars[charIdx % chars.length];

            this.updateVirtualEntity(entity, char);
        }

        for (const [id, mesh] of this.virtualMeshes) {
            if (!activeIds.has(id)) {
                this.virtualScene.remove(mesh);
                this.virtualMeshes.delete(id);
            }
        }
    }

    private updateVirtualEntity(entity: EntityData, char: string) {
        let mesh = this.getOrCreateMesh(entity.id, char);
        if (mesh) {
            mesh.position.copy(entity.pos);
        }
    }

    private getOrCreateMesh(id: string, char: string): any {
        const cp = char.codePointAt(0);
        const hex = cp!.toString(16).toUpperCase();
        let mesh = this.virtualMeshes.get(id);
        const mat = new THREE.MeshBasicMaterial({ color: 0xffffff });

        if (!mesh) {
            // Setup default placeholder box until JSON loads
            const box = new THREE.BoxGeometry(0.5, 0.5, 0.5);
            mesh = new THREE.Mesh(box, mat);
            this.virtualScene.add(mesh);
            this.virtualMeshes.set(id, mesh);

            const cached = this.geometryCache.get(hex);
            if (!cached) {
                const url = `assets/geometry/${hex}.json`;
                this.loader.load(url, (loadedGeo: any) => {
                    this.geometryCache.set(hex, loadedGeo);
                    this.replaceMeshGeometry(id, loadedGeo);
                });
            } else {
                this.replaceMeshGeometry(id, cached);
            }
            return mesh;
        }

        // Existing mesh, check if we need to swap geometry from cache.
        const cached = this.geometryCache.get(hex);
        if (cached && mesh.geometry !== cached && mesh.geometry.type === 'BoxGeometry') {
            return this.replaceMeshGeometry(id, cached);
        }

        return mesh;
    }

    private replaceMeshGeometry(id: string, newGeo: any): any {
        const ex = this.virtualMeshes.get(id);
        if (!ex) return null;

        this.virtualScene.remove(ex);
        ex.geometry.dispose();

        const newMesh = new THREE.Mesh(newGeo, ex.material);
        newMesh.position.copy(ex.position);

        this.virtualScene.add(newMesh);
        this.virtualMeshes.set(id, newMesh);
        return newMesh;
    }

    private createGroundGrid() {
        const geo = new THREE.PlaneGeometry(
            200,
            200,
            100,
            100
        );
        const mat = new THREE.MeshBasicMaterial({
            wireframe: false
        });
        const plane = new THREE.Mesh(geo, mat);
        plane.rotation.x = -Math.PI / 2;
        this.virtualScene.add(plane);
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

    public update(deltaTime: number): void {
        this.controls.update();
        if (this.lidarMaterial) {
            const u = this.lidarMaterial.uniforms;
            u.time.value += deltaTime;
            if (u.entropy) u.entropy.value = this.entropy;
            if (u.dotType) u.dotType.value = this.dotType;
            if (u.dotRadiusMin) u.dotRadiusMin.value = this.dotRadiusMin;
            if (u.dotRadiusMax) u.dotRadiusMax.value = this.dotRadiusMax;
        }
        this.virtualScene.updateMatrixWorld(true);
    }

    public preRender(renderer: any): void {
        this.renderer = renderer;
        const uniforms = this.lidarMaterial.uniforms;

        // Bind the colour texture (which contains depth-packed data) to tDepth.
        uniforms.tDepth.value = this.renderTarget.texture;
        uniforms.cameraNear.value = this.camera.near;
        uniforms.cameraFar.value = this.camera.far;

        const projInv = this.camera.projectionMatrixInverse;
        uniforms.projectionInverse.value.copy(projInv);
        const mw = this.camera.matrixWorld;
        uniforms.viewInverse.value.copy(mw);

        // Depth pass: render virtualScene with linear 
        // depth material.
        // Suppress virtualScene.background during this pass
        // so the explicit white clear (d=1.0 sentinel 
        // for sky) is not overridden by the scene's 
        // black background colour.
        const currentRT = renderer.getRenderTarget();
        renderer.setRenderTarget(this.renderTarget);
        renderer.setClearColor(0xffffff, 1);
        renderer.clear();
        const prevOverride = this.virtualScene.overrideMaterial;
        const prevBackground = this.virtualScene.background;
        this.virtualScene.overrideMaterial = this.linearDepthMaterial;
        this.virtualScene.background = null;  // let explicit clear stand
        this.linearDepthMaterial.uniforms.far.value = this.camera.far;
        renderer.render(this.virtualScene, this.camera);
        this.virtualScene.overrideMaterial = prevOverride;
        this.virtualScene.background = prevBackground;
        renderer.setRenderTarget(currentRT);
    }

    private onWindowResize(): void {
        const w = window.innerWidth;
        const h = window.innerHeight;
        this.camera.aspect = w / h;
        this.camera.updateProjectionMatrix();
        this.renderTarget.setSize(w, h);
        const res = this.lidarMaterial.uniforms.resolution;
        res.value.set(w, h);
    }
}
