import "./global_types.ts";
import { IView } from "./ViewManager.ts";
import {
    EntityData,
    EntityType,
    Terrain
} from "./types.ts";

// --- Configuration ---
const LIDAR_FOV = 90; // Degrees horizontal
const POINT_SIZE = 2.0;

export class LidarView implements IView {
    public scene: any; // THREE.Scene
    public camera: any; // THREE.PerspectiveCamera

    private samplesH = 120;
    private samplesV = 240;

    // The "Virtual" scene contains the actual geometry
    private virtualScene: any; // THREE.Scene
    private virtualMeshes: Map<string, any> = new Map();

    // The Render Target stores depth information
    private renderTarget: any; // THREE.WebGLRenderTarget

    public controls: any; // OrbitControls
    private renderer: any | null = null;

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
        this.camera.position.set(0, 10, 20);

        // Use global OrbitControls
        const THREE_ANY = (window as any).THREE;
        this.controls = new THREE_ANY.OrbitControls(
            this.camera,
            domElement
        );
        this.controls.enableDamping = true;
        this.controls.autoRotate = true;
        this.controls.autoRotateSpeed = 0.5;

        // 2. Setup Virtual Scene
        this.virtualScene = new THREE.Scene();
        const black = new THREE.Color(0x000000);
        this.virtualScene.background = black;

        // 3. Setup Render Target
        const dt = new THREE.DepthTexture(w, h);

        const rtParams = {
            minFilter: THREE.NearestFilter,
            magFilter: THREE.NearestFilter,
            format: THREE.RGBAFormat,
            type: THREE.FloatType,
            depthBuffer: true,
            depthTexture: dt
        };

        this.renderTarget = new THREE.WebGLRenderTarget(
            w,
            h,
            rtParams
        );
        const dTex = this.renderTarget.depthTexture;
        dTex.type = THREE.FloatType;

        // 4. Initialize Lidar Shader & Geometry
        this.lidarMaterial = this.createLidarShader();
        this.rebuildLidarPoints();

        // 5. Initialize Loader
        this.loader = new THREE.BufferGeometryLoader();
        this.createGroundGrid();
    }

    public setScanMode(mode: 'vertical' | 'horizontal') {
        if (mode === 'vertical') {
            this.samplesH = 120;
            this.samplesV = 240;
        } else {
            this.samplesH = 240;
            this.samplesV = 240;
        }
        this.rebuildLidarPoints();
    }

    private rebuildLidarPoints() {
        if (this.lidarPoints) {
            this.scene.remove(this.lidarPoints);
            this.lidarPoints.geometry.dispose();
        }

        const geometry = new THREE.BufferGeometry();
        const positions: number[] = [];
        const uvs: number[] = [];

        for (let x = 0; x < this.samplesH; x++) {
            for (let y = 0; y < this.samplesV; y++) {
                positions.push(0, 0, 0);
                const u = x / (this.samplesH - 1);
                const v = y / (this.samplesV - 1);
                uvs.push(u, v);
            }
        }

        const posAttr = new THREE.Float32BufferAttribute(
            positions,
            3
        );
        const uvAttr = new THREE.Float32BufferAttribute(
            uvs,
            2
        );

        geometry.setAttribute('position', posAttr);
        geometry.setAttribute('uv', uvAttr);

        this.lidarPoints = new THREE.Points(
            geometry,
            this.lidarMaterial
        );
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
            time: { value: 0 }
        };

        const psStr = POINT_SIZE.toFixed(1);

        return new THREE.ShaderMaterial({
            uniforms: uniforms,
            vertexShader: `
                uniform sampler2D tDepth;
                uniform float cameraNear;
                uniform float cameraFar;
                uniform mat4 viewInverse;
                uniform mat4 projectionInverse;
                uniform float time;

                varying float vDepth;
                varying vec2 vUv;

                vec3 getWPos(vec2 uv, float depth) {
                    vec4 n = vec4(
                        uv*2.0-1.0,
                        depth*2.0-1.0,
                        1.0
                    );
                    vec4 v = projectionInverse * n;
                    v /= v.w;
                    vec4 w = viewInverse * v;
                    return w.xyz;
                }

                void main() {
                    vUv = uv;
                    float d = texture2D(tDepth, uv).r;
                    vDepth = d;

                    if(d >= 0.99) {
                        gl_Position = vec4(
                            2.0,
                            2.0,
                            2.0,
                            1.0
                        );
                        gl_PointSize = 0.0;
                        return;
                    }

                    vec3 w = getWPos(uv, d);
                    gl_Position = projectionMatrix *
                                  modelViewMatrix *
                                  vec4(w, 1.0);

                    vec4 vp = modelViewMatrix *
                              vec4(w, 1.0);
                    gl_PointSize = ${psStr} /
                                   -vp.z * 10.0;
                }
            `,
            fragmentShader: `
                varying float vDepth;
                varying vec2 vUv;

                void main() {
                    float modY = mod(gl_FragCoord.y, 2.0);
                    if (modY > 1.0) discard;
                    gl_FragColor = vec4(0.0, 1.0, 0.0, 1.0);
                }
            `,
            transparent: true,
            blending: THREE.AdditiveBlending
        });
    }

    public updateTerrain(terrain: Terrain): void {
        // Placeholder
    }

    public updateEntities(entities: EntityData[]) {
        const charMap: {[key in EntityType]: string[]} = {
            'player': ['🧙', '𐇑', '𐇒'],
            'fauna': ['🦗', '🌱', '🌲'],
            'building': ['👷', '🤖', '🧕'],
            'mineral': ['⭓', '⬠', '💎']
        };

        const activeIds = new Set<string>();

        for(const entity of entities) {
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

            if (!geometry) {
                const url = `assets/geometry/${hex}.json`;
                this.loader.load(url, (loadedGeo: any) => {
                    this.geometryCache.set(hex, loadedGeo);
                    const ex = this.virtualMeshes.get(id);
                    if (ex) {
                        ex.geometry = loadedGeo;
                    }
                });
                const b = new THREE.BoxGeometry(
                    0.5,
                    0.5,
                    0.5
                );
                geometry = b;
            }

            const mat = new THREE.MeshBasicMaterial({
                color: 0xffffff
            });
            mesh = new THREE.Mesh(geometry, mat);

            this.virtualScene.add(mesh);
            this.virtualMeshes.set(id, mesh);
        } else {
            const cp = char.codePointAt(0);
            const hex = cp!.toString(16).toUpperCase();
            const realGeo = this.geometryCache.get(hex);
            if (realGeo && mesh.geometry !== realGeo) {
                if (mesh.geometry.type === 'BoxGeometry') {
                    mesh.geometry = realGeo;
                }
            }
        }

        mesh.position.copy(pos);
        mesh.lookAt(this.camera.position);
    }

    private createGroundGrid() {
        const geo = new THREE.PlaneGeometry(
            200,
            200,
            20,
            20
        );
        const mat = new THREE.MeshBasicMaterial({
            wireframe: true
        });
        const plane = new THREE.Mesh(geo, mat);
        plane.rotation.x = -Math.PI / 2;
        this.virtualScene.add(plane);
    }

    public onActivate(): void {
        const cb = this.onWindowResize.bind(this);
        window.addEventListener('resize', cb);
    }

    public onDeactivate(): void {
        const cb = this.onWindowResize.bind(this);
        window.removeEventListener('resize', cb);
    }

    public update(deltaTime: number): void {
        this.controls.update();
        if (this.lidarMaterial) {
            const u = this.lidarMaterial.uniforms;
            u.time.value += deltaTime;
        }
        this.virtualScene.updateMatrixWorld(true);
    }

    public preRender(renderer: any): void {
        this.renderer = renderer;
        const uniforms = this.lidarMaterial.uniforms;

        const dTex = this.renderTarget.depthTexture;
        uniforms.tDepth.value = dTex;
        uniforms.cameraNear.value = this.camera.near;
        uniforms.cameraFar.value = this.camera.far;

        const projInv = this.camera.projectionMatrixInverse;
        uniforms.projectionInverse.value.copy(projInv);
        const mw = this.camera.matrixWorld;
        uniforms.viewInverse.value.copy(mw);

        const currentRT = renderer.getRenderTarget();
        renderer.setRenderTarget(this.renderTarget);
        renderer.setClearColor(0x000000);
        renderer.clear();
        renderer.render(this.virtualScene, this.camera);
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
