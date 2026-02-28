import "./global_types.ts";
import { IView } from "./ViewManager.ts";
import {
    EntityData,
    EntityType,
    Terrain
} from "./types.ts";
import { LidarVertexShader, LidarFragmentShader } from "./LidarShaders.ts";

// --- Configuration ---
const POINT_SIZE = 2.0;

export class LidarView implements IView {
    public scene: any; // THREE.Scene
    public camera: any; // THREE.PerspectiveCamera

    private samplesH = 480;
    private samplesV = 270; // Dense sampling required for full depth texture coverage
    public currentMode: 'vertical' | 'horizontal' = 'horizontal'; // Default to horizontal/cheapo
    public entropy: number = 0.1; // Parametric signal loss (0=no noise, 1=max)

    // The "Virtual" scene contains the actual geometry
    private virtualScene: any; // THREE.Scene
    private virtualMeshes: Map<string, any> = new Map();

    // FloatType RGBA render target — depth is stored as a full-precision
    // 32-bit float in the R channel.
    //
    // We do NOT use a DepthTexture (WebGL2 prevents vertex shader sampling)
    // and NOT UnsignedByteType (the 0.1/1000 near/far ratio maps all visible
    // geometry to byte 252-255, losing all depth discrimination).
    //
    // The depth pass renders virtualScene with overrideMaterial = linearDepthMaterial,
    // a custom shader that writes `z_view / cameraFar` directly into R.
    // Sky background is cleared to white (d=1.0) and suppressed during this
    // pass so the scene's black background cannot override the clear.
    private renderTarget: any;      // THREE.WebGLRenderTarget (FloatType)
    private linearDepthMaterial: any; // custom ShaderMaterial

    public controls: any; // OrbitControls
    private renderer: any | null = null;
    private boundResize: () => void;

    // Resources
    private loader: any; // THREE.BufferGeometryLoader
    private lidarMaterial: any; // THREE.ShaderMaterial
    private lidarPoints: any; // THREE.Points

    // Cache for Geometries
    private geometryCache: Map<string, any> = new Map();

    constructor(domElement: HTMLCanvasElement) {
        // 1. Setup Main Scene
        this.scene = new THREE.Scene();
        // Deep Lidar Black/Green
        const color = new THREE.Color(0x000500);
        this.scene.background = color;

        const w = window.innerWidth;
        const h = window.innerHeight;
        const aspect = w / h;

        this.camera = new THREE.PerspectiveCamera(
            75,
            aspect,
            0.1,
            1000
        );
        // Camera at (0,8,20), target at default (0,0,0):
        // offset = (0,8,20), phi = arccos(8/21.5) ≈ 68° from north pole.
        // Camera looks (90-68)=22° below horizontal — ground fills lower screen
        // without needing any mouse interaction.
        // IMPORTANT: do NOT set controls.target to (0,0,Z) — that would move
        // the orbit centre while keeping phi=0 (north pole), making camera look straight down.
        this.camera.position.set(0, 8, 20);

        // Use global OrbitControls
        const THREE_ANY = (window as any).THREE;
        this.controls = new THREE_ANY.OrbitControls(
            this.camera,
            domElement
        );
        this.controls.enableDamping = true;
        // autoRotate OFF: default view must be deterministic for developers.
        this.controls.autoRotate = false;
        // Leave controls.target at default (0,0,0).  Any target.set() call on
        // a camera that started on the Y axis would preserve phi=0 = straight down.

        // 2. Setup Virtual Scene
        this.virtualScene = new THREE.Scene();
        const black = new THREE.Color(0x000000);
        this.virtualScene.background = black;

        // 3. Setup Render Target — FloatType for full-precision linear depth.
        // EXT_color_buffer_float is confirmed available in this WebGL2 context.
        // UnsignedByteType (8-bit) is unusable: with near=0.1/far=1000 all
        // visible geometry maps to byte 252–255, indistinguishable and discarded.
        this.renderTarget = new THREE.WebGLRenderTarget(w, h, {
            minFilter: THREE.NearestFilter,
            magFilter: THREE.NearestFilter,
            format: THREE.RGBAFormat,
            type: THREE.FloatType,
        });

        // Linear depth material — writes z_view / cameraFar into R channel
        // as a full 32-bit float.  z_view is the positive view-space depth
        // (distance along the camera -Z axis).  Sky background is cleared
        // to white (d=1.0) so the vertex shader can discard it with d > 0.99.
        this.linearDepthMaterial = new THREE.ShaderMaterial({
            uniforms: {
                far: { value: this.camera.far }
            },
            vertexShader: `
                varying float vViewZ;
                void main() {
                    vec4 vPos = modelViewMatrix * vec4(position, 1.0);
                    vViewZ = -vPos.z; // positive depth along -Z
                    gl_Position = projectionMatrix * vPos;
                }
            `,
            fragmentShader: `
                uniform float far;
                varying float vViewZ;
                void main() {
                    // Store linear depth [0,1] as full-precision float in R.
                    gl_FragColor = vec4(vViewZ / far, 0.0, 0.0, 1.0);
                }
            `,
        });

        // 4. Initialize Lidar Shader & Geometry
        this.lidarMaterial = this.createLidarShader();
        this.rebuildLidarPoints();

        // 5. Initialize Loader
        this.loader = new THREE.BufferGeometryLoader();
        this.createGroundGrid();

        // Store bound handler once for correct
        // add/removeEventListener pairing.
        this.boundResize =
            this.onWindowResize.bind(this);

        // **TEST SPHERE** — remove after terrain rendering is confirmed.
        // Camera at (0,8,20) looking at origin (~22° below horizontal).
        // Sphere at (0,1,10): camera-to-sphere distance ≈ sqrt(49+100)=12.2 units.
        // brightness = clamp(1-12.2/30, 0.05, 1.0) = 0.59 — clearly visible bright green.
        const debugGeo = new THREE.SphereGeometry(1.5, 16, 16);
        const debugMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const debugMesh = new THREE.Mesh(debugGeo, debugMat);
        debugMesh.position.set(0, 1.5, 10);
        this.virtualScene.add(debugMesh);
    }

    public setScanMode(
        mode: 'vertical' | 'horizontal'
    ) {
        this.currentMode = mode;
        // Both modes use the same dense 480×270
        // sample grid.  The horizontal scan-line
        // visual is produced entirely in the
        // fragment shader (gl_FragCoord.y mod band)
        // — NOT by reducing sample density.
        this.samplesH = 480;
        this.samplesV = 270;

        if (this.lidarMaterial) {
            this.lidarMaterial.uniforms
                .scanMode.value =
                mode === 'vertical'
                    ? 0.0 : 1.0;
        }
        this.rebuildLidarPoints();
    }

    private rebuildLidarPoints() {
        if (this.lidarPoints) {
            this.scene.remove(this.lidarPoints);
            this.lidarPoints.geometry.dispose();
        }

        // Both horizontal and vertical modes use THREE.Points.
        // The scan-line visual effect for horizontal mode is produced entirely
        // in the fragment shader (band-period discard), NOT by LineSegments geometry.
        // This eliminates depth-discontinuity line artifacts.
        const geometry = new THREE.BufferGeometry();
        const positions: number[] = [];
        const uvs: number[] = [];

        for (let y = 0; y < this.samplesV; y++) {
            for (let x = 0; x < this.samplesH; x++) {
                positions.push(0, 0, 0);
                const u = x / (this.samplesH - 1);
                const v = y / (this.samplesV - 1);
                uvs.push(u, v);
            }
        }

        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));

        this.lidarPoints = new THREE.Points(geometry, this.lidarMaterial);
        this.lidarPoints.frustumCulled = false;
        this.scene.add(this.lidarPoints);
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
            scanMode: { value: this.currentMode === 'vertical' ? 0.0 : 1.0 },
            entropy: { value: this.entropy },
            // diagMode: 0.0 = normal rendering, 1.0 = diagnostic (red=elevated, blue=ground).
            // Toggle from browser console: lidarView.lidarMaterial.uniforms.diagMode.value = 1.0
            diagMode: { value: 0.0 }
        };

        const psStr = POINT_SIZE.toFixed(1);
        const resolvedVertexShader = LidarVertexShader.replace("POINT_SIZE_VALUE", psStr);

        return new THREE.ShaderMaterial({
            uniforms: uniforms,
            vertexShader: resolvedVertexShader,
            fragmentShader: LidarFragmentShader,
            transparent: true,
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

            this.updateVirtualEntity(
                entity.id,
                entity.type,
                entity.pos,
                char
            );
        }

        for (const [id, mesh] of this.virtualMeshes) {
            if (!activeIds.has(id)) {
                this.virtualScene.remove(mesh);
                this.virtualMeshes.delete(id);
            }
        }
    }

    private updateVirtualEntity(
        id: string,
        type: EntityType,
        pos: any,
        char: string
    ) {
        let mesh = this.virtualMeshes.get(id);

        if (!mesh) {
            const cp = char.codePointAt(0);
            const hex = cp!.toString(16).toUpperCase();
            let geometry = this.geometryCache.get(hex);

            const mat = new THREE.MeshBasicMaterial({
                color: 0xffffff
            });

            if (!geometry) {
                const b = new THREE.BoxGeometry(
                    0.5,
                    0.5,
                    0.5
                );

                mesh = new THREE.Mesh(b, mat);
                this.virtualScene.add(mesh);
                this.virtualMeshes.set(id, mesh);

                const url = `assets/geometry/${hex}.json`;
                this.loader.load(url, (loadedGeo: any) => {
                    this.geometryCache.set(hex, loadedGeo);

                    const ex = this.virtualMeshes.get(id);
                    if (ex && ex.geometry === b) {
                        // Reconstruct the mesh safely instead of hot-swapping geometries
                        this.virtualScene.remove(ex);
                        ex.geometry.dispose();

                        const newMesh = new THREE.Mesh(loadedGeo, mat);
                        newMesh.position.copy(ex.position);

                        this.virtualScene.add(newMesh);
                        this.virtualMeshes.set(id, newMesh);
                    }
                });
            } else {
                mesh = new THREE.Mesh(geometry, mat);
                this.virtualScene.add(mesh);
                this.virtualMeshes.set(id, mesh);
            }
        } else {
            const cp = char.codePointAt(0);
            const hex = cp!.toString(16).toUpperCase();
            const realGeo = this.geometryCache.get(hex);
            if (realGeo && mesh.geometry !== realGeo) {
                if (mesh.geometry.type === 'BoxGeometry') {
                    // Reconstruct the mesh safely instead of hot-swapping geometries
                    this.virtualScene.remove(mesh);
                    mesh.geometry.dispose();

                    const newMesh = new THREE.Mesh(realGeo, mesh.material);
                    newMesh.position.copy(mesh.position);

                    this.virtualScene.add(newMesh);
                    this.virtualMeshes.set(id, newMesh);
                    mesh = newMesh; // Point our local reference to the new mesh 
                }
            }
        }

        mesh.position.copy(pos);
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

        // Depth pass: render virtualScene with linear depth material.
        // Suppress virtualScene.background during this pass so the explicit
        // white clear (d=1.0 sentinel for sky) is not overridden by the
        // scene's black background colour.
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
