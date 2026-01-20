import "./global_types.ts";
import { IView } from "./ViewManager.ts";
import { EntityData, EntityType, Terrain } from "./types.ts";

// --- Configuration ---
const LIDAR_FOV = 90; // Degrees horizontal
const POINT_SIZE = 2.0;

export class LidarView implements IView {
    public scene: any; // THREE.Scene
    public camera: any; // THREE.PerspectiveCamera

    private samplesH = 120;
    private samplesV = 240;

    // The "Virtual" scene contains the actual geometry (Text/Emoticons)
    // It is rendered to a texture, but never shown directly to the user.
    private virtualScene: any; // THREE.Scene
    private virtualMeshes: Map<string, any> = new Map(); // THREE.Mesh

    // The Render Target stores the depth information of the virtual scene
    private renderTarget: any; // THREE.WebGLRenderTarget

    public controls: any; // OrbitControls
    private renderer: any | null = null; // THREE.WebGLRenderer

    // Resources
    private loader: any; // THREE.BufferGeometryLoader
    private lidarMaterial: any; // THREE.ShaderMaterial
    private lidarPoints: any; // THREE.Points

    // Cache for Geometries to optimize performance
    private geometryCache: Map<string, any> = new Map(); // THREE.BufferGeometry

    constructor(domElement: HTMLCanvasElement) {
        // 1. Setup Main Scene (The Lidar Display)
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x000500); // Deep Lidar Black/Green

        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(0, 10, 20);

        // Use global OrbitControls
        this.controls = new (window as any).THREE.OrbitControls(this.camera, domElement);
        this.controls.enableDamping = true;
        this.controls.autoRotate = true; // Optional: subtle spin to show off 3D
        this.controls.autoRotateSpeed = 0.5;

        // 2. Setup Virtual Scene (The Source Data)
        this.virtualScene = new THREE.Scene();
        this.virtualScene.background = new THREE.Color(0x000000);

        // 3. Setup Render Target (Depth Buffer)
        this.renderTarget = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight, {
            minFilter: THREE.NearestFilter,
            magFilter: THREE.NearestFilter,
            format: THREE.RGBAFormat,
            type: THREE.FloatType, // High precision for depth
            depthBuffer: true,
            depthTexture: new THREE.DepthTexture(window.innerWidth, window.innerHeight)
        });
        this.renderTarget.depthTexture.type = THREE.FloatType;

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
            // Horizontal Scanning: Double sampling rate as requested
            // 240x240 is 57,600 points (vs 120x240 = 28,800)
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

        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));

        this.lidarPoints = new THREE.Points(geometry, this.lidarMaterial);
        this.scene.add(this.lidarPoints);
    }

    private createLidarShader(): any { // THREE.ShaderMaterial
        return new THREE.ShaderMaterial({
            uniforms: {
                tDepth: { value: null }, // The depth texture
                cameraNear: { value: 0.1 },
                cameraFar: { value: 1000.0 },
                viewInverse: { value: new THREE.Matrix4() },
                projectionInverse: { value: new THREE.Matrix4() },
                resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
                time: { value: 0 }
            },
            vertexShader: `
                uniform sampler2D tDepth;
                uniform float cameraNear;
                uniform float cameraFar;
                uniform mat4 viewInverse;
                uniform mat4 projectionInverse;
                uniform float time;

                varying float vDepth;
                varying vec2 vUv;

                // Helper to reconstruct world position from depth
                vec3 getWorldPosition(vec2 uv, float depth) {
                    // Convert to Normalized Device Coordinates (NDC) -1 to 1
                    vec4 ndc = vec4(uv * 2.0 - 1.0, depth * 2.0 - 1.0, 1.0);

                    // Unproject to View Space
                    vec4 viewPos = projectionInverse * ndc;
                    viewPos /= viewPos.w;

                    // Unproject to World Space
                    vec4 worldPos = viewInverse * viewPos;
                    return worldPos.xyz;
                }

                void main() {
                    vUv = uv;

                    // Sample depth from the virtual scene render
                    float depth = texture2D(tDepth, uv).r;
                    vDepth = depth;

                    // If depth is 1.0 (skybox), we push the point off-screen or discard
                    if(depth >= 0.99) {
                        gl_Position = vec4(2.0, 2.0, 2.0, 1.0); // Clip
                        gl_PointSize = 0.0;
                        return;
                    }

                    vec3 worldPos = getWorldPosition(uv, depth);

                    // Add a "wobble" effect to simulate imperfect Lidar sensors
                    // worldPos.x += sin(uv.y * 50.0 + time) * 0.02;

                    gl_Position = projectionMatrix * modelViewMatrix * vec4(worldPos, 1.0);

                    // Size attenuation based on distance
                    vec4 viewPos = modelViewMatrix * vec4(worldPos, 1.0);
                    gl_PointSize = ${POINT_SIZE.toFixed(1)} / -viewPos.z * 10.0;
                }
            `,
            fragmentShader: `
                varying float vDepth;
                varying vec2 vUv;

                void main() {
                    // Simple green color
                    // We can fade color based on depth to simulate signal loss
                    float intensity = 1.0 - smoothstep(0.0, 0.1, vDepth);

                    // Vertical scanline effect aesthetics
                    if (mod(gl_FragCoord.y, 2.0) > 1.0) discard;

                    gl_FragColor = vec4(0.0, 1.0, 0.0, 1.0);
                }
            `,
            transparent: true,
            blending: THREE.AdditiveBlending
        });
    }

    public updateTerrain(terrain: Terrain): void {
        // Optional: Implement Lidar ground grid from terrain data?
        // For now, we stick to the wireframe plane created in createGroundGrid
    }

    public updateEntities(entities: EntityData[]) {
        // Map types to character sets based on Design Document
        const charMap: {[key in EntityType]: string[]} = {
            'player': ['🧙', '𐇑', '𐇒'], // Head
            'fauna': ['🦗', '🌱', '🌲'], // Fauna (Society)
            'building': ['👷', '🤖', '🧕'], // Unit (Building context)
            'mineral': ['⭓', '⬠', '💎'] // Mineral
        };

        const activeIds = new Set<string>();

        for(const ent of entities) {
            activeIds.add(ent.id);

            // Deterministic char selection based on ID hash
            const chars = charMap[ent.type] || ['?'];
            const index = ent.id.charCodeAt(ent.id.length - 1) % chars.length;
            const char = chars[index];

            this.updateVirtualEntity(ent.id, ent.type, ent.pos, char);
        }

        // Cleanup
        for (const [id, mesh] of this.virtualMeshes) {
            if (!activeIds.has(id)) {
                this.virtualScene.remove(mesh);
                this.virtualMeshes.delete(id);
            }
        }
    }

    // Creates the text geometry in the virtual scene
    private updateVirtualEntity(id: string, type: EntityType, pos: any, char: string) {
        let mesh = this.virtualMeshes.get(id);

        if (!mesh) {
            // Check cache by Hex Code
            const hex = char.codePointAt(0)!.toString(16).toUpperCase();
            let geometry = this.geometryCache.get(hex);

            if (!geometry) {
                // Async load geometry
                const url = `assets/geometry/${hex}.json`;

                // Placeholder geometry while loading? or just wait.
                // We'll fire the loader.
                this.loader.load(url, (geo: any) => {
                    this.geometryCache.set(hex, geo);
                    // Re-check if mesh still needs creation (async race)
                    if (this.virtualMeshes.has(id)) {
                        const m = this.virtualMeshes.get(id);
                        m.geometry = geo;
                    } else {
                        // If entity was created while loading, it might not have a mesh yet if we returned early.
                        // Ideally we create a dummy mesh and swap geometry.
                    }
                }, undefined, (err: any) => {
                    console.warn(`Geometry load failed for ${char} (${hex})`, err);
                });

                // Create a temporary placeholder geometry (small box)
                geometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
            }

            // Simple basic material for depth rendering
            const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
            mesh = new THREE.Mesh(geometry, material);

            this.virtualScene.add(mesh);
            this.virtualMeshes.set(id, mesh);
        } else {
            // If we have a mesh, check if we need to update geometry (if it was a placeholder)
            const hex = char.codePointAt(0)!.toString(16).toUpperCase();
            const realGeo = this.geometryCache.get(hex);
            if (realGeo && mesh.geometry !== realGeo && mesh.geometry.type === 'BoxGeometry') {
                mesh.geometry = realGeo;
            }
        }

        mesh.position.copy(pos);
        mesh.lookAt(this.camera.position);
    }

    private createGroundGrid() {
        // We add some static geometry to the virtual scene so the Lidar has ground to hit
        const geometry = new THREE.PlaneGeometry(200, 200, 20, 20);
        const material = new THREE.MeshBasicMaterial({ wireframe: true });
        const plane = new THREE.Mesh(geometry, material);
        plane.rotation.x = -Math.PI / 2;
        this.virtualScene.add(plane);
    }

    // --- IView Implementation ---

    public onActivate(): void {
        window.addEventListener('resize', this.onWindowResize.bind(this));
    }

    public onDeactivate(): void {
        window.removeEventListener('resize', this.onWindowResize.bind(this));
        // Cleanup if needed
    }

    public update(deltaTime: number): void {
        this.controls.update();
        if (this.lidarMaterial) {
            this.lidarMaterial.uniforms.time.value += deltaTime;
        }

        // Sync Virtual Camera with Real Camera
        // We want the Lidar Scan to originate from the User's perspective
        this.virtualScene.updateMatrixWorld(true);
    }

    public preRender(renderer: any): void {
        this.renderer = renderer; // Cache it

        // 1. Update Uniforms
        this.lidarMaterial.uniforms.tDepth.value = this.renderTarget.depthTexture;
        this.lidarMaterial.uniforms.cameraNear.value = this.camera.near;
        this.lidarMaterial.uniforms.cameraFar.value = this.camera.far;
        this.lidarMaterial.uniforms.projectionInverse.value.copy(this.camera.projectionMatrixInverse);
        this.lidarMaterial.uniforms.viewInverse.value.copy(this.camera.matrixWorld);

        // 2. Render Virtual Scene to FBO (Depth Only needed essentially)
        // We must ensure the virtual scene is rendered from the EXACT same camera position
        const currentRenderTarget = renderer.getRenderTarget();

        renderer.setRenderTarget(this.renderTarget);
        renderer.setClearColor(0x000000); // Clear depth to far (or 0 depending on setup, usually 1.0 is far in depth buffer but here we clear color)
        // Note: DepthTexture usually works automatically with depth buffer.

        renderer.clear();
        renderer.render(this.virtualScene, this.camera);

        // 3. Reset to screen
        renderer.setRenderTarget(currentRenderTarget);
    }

    private onWindowResize(): void {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderTarget.setSize(window.innerWidth, window.innerHeight);
        this.lidarMaterial.uniforms.resolution.value.set(window.innerWidth, window.innerHeight);
    }
}
