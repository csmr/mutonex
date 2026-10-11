import '../core/global_types.ts';
import { IView } from '../core/ViewManager.ts';
import {
  FirstPersonControls,
} from '../input/FirstPersonControls.ts';
import { EntityRenderer } from '../render/EntityRenderer.ts';
import { createTerrainMesh } from '../render/TerrainMesh.ts';
import { EntityData, Terrain } from '../core/types.ts';
import {
  LidarFragmentShader,
  LidarVertexShader,
  NormalMeshFragmentShader,
  NormalMeshVertexShader,
  OutlineFragmentShader,
  OutlineVertexShader,
  ProceduralMeshFragmentShader,
  ProceduralMeshVertexShader,
} from '../render/LidarShaders.ts';
import {
  LidarStyleConfig,
  LidarStyles,
} from '../render/LidarStyles.ts';

export class LidarView implements IView {
  public scene: any;
  public camera: any;

  public currentStyleName = 'pointCloud';
  public dotRadiusMin = 1.0;
  public dotRadiusMax = 4.0;
  public dotType = 1.0;

  private samplesH = 480;
  private samplesV = 300;
  public entropy = 0.1;

  private virtualScene: any;
  private entityRenderer: EntityRenderer;

  private renderTarget: any;
  private normalRenderTarget: any;
  private baseMaterials: Map<number, any> = new Map();
  private normalMaterial: any;

  public controls: any;
  private renderer: any | null = null;
  private boundResize: () => void;
  private boundKeyDown: (e: KeyboardEvent) => void;

  private loader: any;
  private lidarMaterial: any;
  private outlineMaterial: any;
  private outlineMesh: any;
  private lidarPoints: any;

  private modelCache: Map<string, any> = new Map();
  private isRebuildingBuffer = false;
  private pendingStyleConfig: string | null = null;
  public terrainMesh: any | null = null;
  public raycastEnabled = true;

  constructor(domElement: HTMLCanvasElement) {
    this.initMainScene(domElement);
    this.initVirtualScene();
    this.initRenderTarget();

    this.entityRenderer = new EntityRenderer(
      this.virtualScene,
      (color: number) => this.getLidarBaseMaterial(color),
    );

    this.normalMaterial = new THREE.ShaderMaterial({
      uniforms: { far: { value: this.camera.far } },
      vertexShader: NormalMeshVertexShader,
      fragmentShader: NormalMeshFragmentShader,
    });

    this.lidarMaterial = this.createLidarShader();
    this.outlineMaterial = this.createOutlineShader();
    this.initOutlineQuad();
    this.createGroundGrid();
    this.startBufferRebuild(LidarStyles.pointCloud);

    this.loader = new THREE.BufferGeometryLoader();
    this.boundResize = this.onWindowResize.bind(this);
    this.boundKeyDown = this.onKeyDown.bind(this);
  }

  private onKeyDown(e: KeyboardEvent): void {
    if (e.key === 'k' || e.key === 'K') {
      this.cycleShaderMode();
    }
  }

  private initMainScene(domElement: HTMLCanvasElement) {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x050100);

    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(
      75,
      w / h,
      0.1,
      1000,
    );
    this.camera.position.set(10, 1.7, 10);
    this.controls = new FirstPersonControls(
      this.camera,
      domElement,
    );
  }

  private initVirtualScene() {
    this.virtualScene = new THREE.Scene();
    this.virtualScene.background = new THREE.Color(0x000000);

    const debugGeo = new THREE.SphereGeometry(1.5, 16, 16);
    const debugMat = this.getLidarBaseMaterial(0xff0000);
    const debugMesh = new THREE.Mesh(debugGeo, debugMat);
    debugMesh.position.set(0, 1.5, 10);
    this.virtualScene.add(debugMesh);
  }

  private initRenderTarget() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const opts = {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      format: THREE.RGBAFormat,
      type: THREE.FloatType,
    };
    this.renderTarget = new THREE.WebGLRenderTarget(w, h, opts);
    this.normalRenderTarget = new THREE.WebGLRenderTarget(
      w,
      h,
      opts,
    );
  }

  private getLidarBaseMaterial(colorHex: number): any {
    let mat = this.baseMaterials.get(colorHex);
    if (!mat) {
      mat = new THREE.ShaderMaterial({
        uniforms: {
          far: { value: this.camera.far },
          uColor: { value: new THREE.Color(colorHex) },
          uProceduralMode: { value: 0.0 },
          stripeSpacing: { value: 0.017 },
          stripeWidth: { value: 0.002 },
          time: { value: 0.0 },
        },
        vertexShader: ProceduralMeshVertexShader,
        fragmentShader: ProceduralMeshFragmentShader,
      });
      this.baseMaterials.set(colorHex, mat);
    }
    return mat;
  }

  private updateOutlineUniforms(cfg: any): void {
    if (!this.outlineMaterial || !cfg) return;
    const u = this.outlineMaterial.uniforms;
    u.minWidth.value = cfg.minWidth ?? 1.0;
    u.maxWidth.value = cfg.maxWidth ?? 15.0;
    u.shadeMode.value = cfg.shadeMode ?? 0.0;
    u.nearEdgeColor.value.set(cfg.nearEdgeColor ?? '#b24d00');
    u.farEdgeColor.value.set(cfg.farEdgeColor ?? '#000000');
    u.depthThreshold.value = cfg.depthThreshold;
  }

  public setLidarStyle(styleName: string) {
    const config = LidarStyles[styleName] ||
      LidarStyles.pointCloud;
    this.currentStyleName = styleName;
    console.log(`LidarView style set to: ${styleName}`);

    this.samplesH = config.samplesH;
    this.samplesV = config.samplesV;
    this.dotType = config.dotType;
    this.dotRadiusMin = config.dotRadiusMin;
    this.dotRadiusMax = config.dotRadiusMax;

    if (this.lidarMaterial) {
      this.lidarMaterial.uniforms.scanMode.value = config.scanMode;
      this.lidarMaterial.uniforms.dotType.value = this.dotType;
      this.lidarMaterial.uniforms.dotRadiusMin.value =
        this.dotRadiusMin;
      this.lidarMaterial.uniforms.dotRadiusMax.value =
        this.dotRadiusMax;
    }

    this.updateOutlineUniforms(config.outline);
    const isProcedural = styleName === 'proceduralLidar';

    if (isProcedural) {
      this.scene.add(this.virtualScene);
      if (this.lidarPoints) this.lidarPoints.visible = false;
    } else {
      this.scene.remove(this.virtualScene);
      if (this.lidarPoints) this.lidarPoints.visible = true;
    }

    for (const mat of this.baseMaterials.values()) {
      mat.uniforms.uProceduralMode.value = isProcedural
        ? 1.0
        : 0.0;
    }

    if (this.isRebuildingBuffer) {
      this.pendingStyleConfig = styleName;
    } else {
      this.startBufferRebuild(config);
    }
  }

  public cycleShaderMode(): void {
    if (!this.outlineMaterial) return;
    const u = this.outlineMaterial.uniforms;
    const cur = u.shadeMode.value;
    const next = cur > 0.5 ? 0.0 : 1.0;
    u.shadeMode.value = next;
    const modeName = next > 0.5
      ? 'World Normal'
      : 'Screen Space';
    console.log(`LidarView shadeMode toggled to: ${modeName}`);
  }

  private startBufferRebuild(config: LidarStyleConfig) {
    this.isRebuildingBuffer = true;
    this.pendingStyleConfig = null;

    const gen = this.chunkedGeometryGenerator(
      config.samplesH,
      config.samplesV,
    );
    const processChunk = () => {
      const result = gen.next();
      if (!result.done) {
        requestAnimationFrame(processChunk);
      } else {
        this.isRebuildingBuffer = false;
        if (this.lidarPoints) {
          this.scene.remove(this.lidarPoints);
          this.lidarPoints.geometry.dispose();
        }
        this.lidarPoints = result.value as any;
        this.scene.add(this.lidarPoints);
        if (this.pendingStyleConfig) {
          this.setLidarStyle(this.pendingStyleConfig);
        }
      }
    };
    requestAnimationFrame(processChunk);
  }

  private *chunkedGeometryGenerator(
    samplesH: number,
    samplesV: number,
  ): Generator<void, any, void> {
    const geometry = new THREE.BufferGeometry();
    const totalPoints = samplesH * samplesV;
    const positions = new Float32Array(totalPoints * 3);
    const uvs = new Float32Array(totalPoints * 2);

    const chunkSize = 50000;
    let currentIdx = 0;

    for (let y = 0; y < samplesV; y++) {
      for (let x = 0; x < samplesH; x++) {
        uvs[currentIdx * 2] = x / (samplesH - 1);
        uvs[currentIdx * 2 + 1] = y / (samplesV - 1);
        currentIdx++;
        if (currentIdx % chunkSize === 0) yield;
      }
    }

    geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(positions, 3),
    );
    geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));

    const points = new THREE.Points(geometry, this.lidarMaterial);
    points.frustumCulled = false;
    return points;
  }

  private createOutlineShader(): any {
    const res = new THREE.Vector2(
      window.innerWidth,
      window.innerHeight,
    );
    const cfg = LidarStyles[this.currentStyleName]?.outline;
    return new THREE.ShaderMaterial({
      uniforms: {
        tScene: { value: null },
        tNormal: { value: null },
        resolution: { value: res },
        minWidth: { value: cfg?.minWidth ?? 1.0 },
        maxWidth: { value: cfg?.maxWidth ?? 15.0 },
        far: { value: this.camera.far },
        shadeMode: { value: cfg?.shadeMode ?? 0.0 },
        nearEdgeColor: {
          value: new THREE.Color(
            cfg?.nearEdgeColor ?? '#b24d00',
          ),
        },
        farEdgeColor: {
          value: new THREE.Color(
            cfg?.farEdgeColor ?? '#000000',
          ),
        },
        depthThreshold: { value: cfg?.depthThreshold ?? 0.04 },
        outlineDebug: { value: 0.0 },
      },
      vertexShader: OutlineVertexShader,
      fragmentShader: OutlineFragmentShader,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      blending: THREE.NormalBlending,
    });
  }

  private initOutlineQuad(): void {
    const geo = new THREE.PlaneGeometry(2, 2);
    this.outlineMesh = new THREE.Mesh(geo, this.outlineMaterial);
    this.outlineMesh.frustumCulled = false;
  }

  private createLidarShader(): any {
    const resolution = new THREE.Vector2(
      window.innerWidth,
      window.innerHeight,
    );
    const uniforms = {
      tDepth: { value: null },
      cameraNear: { value: 0.1 },
      cameraFar: { value: 1000.0 },
      viewInverse: { value: new THREE.Matrix4() },
      projectionInverse: { value: new THREE.Matrix4() },
      resolution: { value: resolution },
      time: { value: 0 },
      scanMode: {
        value: LidarStyles[this.currentStyleName]?.scanMode ?? 1.0,
      },
      entropy: { value: this.entropy },
      diagMode: { value: 0.0 },
      dotType: { value: this.dotType },
      dotRadiusMin: { value: this.dotRadiusMin },
      dotRadiusMax: { value: this.dotRadiusMax },
    };

    return new THREE.ShaderMaterial({
      uniforms: uniforms,
      vertexShader: LidarVertexShader,
      fragmentShader: LidarFragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
  }

  public updateTerrain(terrain: Terrain): void {
    if (this.terrainMesh) {
      this.virtualScene.remove(this.terrainMesh);
      if (this.terrainMesh.geometry) {
        this.terrainMesh.geometry.dispose();
      }
    }

    const material = this.getLidarBaseMaterial(0x88aa88);
    this.terrainMesh = createTerrainMesh(terrain, material);
    this.virtualScene.add(this.terrainMesh);
  }

  public updateEntities(
    entities: EntityData[],
    localPlayerId?: string,
  ) {
    const filtered = localPlayerId
      ? entities.filter((e) => e.id !== localPlayerId)
      : entities;
    this.entityRenderer.update(filtered);
  }

  private createGroundGrid() {
    const geo = new THREE.PlaneGeometry(200, 200, 100, 100);
    const mat = this.getLidarBaseMaterial(0x333333);
    const plane = new THREE.Mesh(geo, mat);
    plane.rotation.x = -Math.PI / 2;
    this.virtualScene.add(plane);
  }

  public onActivate(): void {
    window.addEventListener('resize', this.boundResize);
    window.addEventListener('keydown', this.boundKeyDown);
    if (this.controls) this.controls.enabled = true;
  }

  public onDeactivate(): void {
    window.removeEventListener('resize', this.boundResize);
    window.removeEventListener('keydown', this.boundKeyDown);
  }

  public getInteractableObjects(): any[] {
    return this.virtualScene.children;
  }

  public dispose(): void {
    window.removeEventListener('resize', this.boundResize);
    window.removeEventListener('keydown', this.boundKeyDown);
    if (this.controls) {
      this.controls.dispose();
      this.controls.enabled = false;
    }
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
    for (const mat of this.baseMaterials.values()) {
      mat.uniforms.time.value += deltaTime;
    }
    this.virtualScene.updateMatrixWorld(true);
  }

  public preRender(renderer: any): void {
    this.renderer = renderer;

    const currentRT = renderer.getRenderTarget();
    renderer.setRenderTarget(this.renderTarget);
    renderer.setClearColor(0x000000, 1.0);
    renderer.clear();

    for (const mat of this.baseMaterials.values()) {
      mat.uniforms.far.value = this.camera.far;
    }

    const prevBg = this.virtualScene.background;
    this.virtualScene.background = null;
    renderer.render(this.virtualScene, this.camera);

    if (this.outlineMaterial?.uniforms.shadeMode.value > 0.5) {
      renderer.setRenderTarget(this.normalRenderTarget);
      renderer.clear();
      this.virtualScene.overrideMaterial = this.normalMaterial;
      renderer.render(this.virtualScene, this.camera);
      this.virtualScene.overrideMaterial = null;
    }

    this.virtualScene.background = prevBg;
    renderer.setRenderTarget(currentRT);

    if (this.outlineMaterial) {
      const u = this.outlineMaterial.uniforms;
      u.tScene.value = this.renderTarget.texture;
      u.tNormal.value = this.normalRenderTarget.texture;
      u.far.value = this.camera.far;
    }

    if (this.currentStyleName !== 'proceduralLidar') {
      const uniforms = this.lidarMaterial.uniforms;
      uniforms.tDepth.value = this.renderTarget.texture;
      uniforms.cameraNear.value = this.camera.near;
      uniforms.cameraFar.value = this.camera.far;
      uniforms.projectionInverse.value.copy(
        this.camera.projectionMatrixInverse,
      );
      uniforms.viewInverse.value.copy(this.camera.matrixWorld);
    }
  }

  public postRender(renderer: any): void {
    if (this.outlineMesh) {
      const prevAutoClear = renderer.autoClear;
      renderer.autoClear = false;
      renderer.render(this.outlineMesh, this.camera);
      renderer.autoClear = prevAutoClear;
    }
  }

  private onWindowResize(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderTarget.setSize(w, h);
    this.normalRenderTarget.setSize(w, h);
    if (this.lidarMaterial) {
      this.lidarMaterial.uniforms.resolution.value.set(w, h);
    }
    if (this.outlineMaterial) {
      this.outlineMaterial.uniforms.resolution.value.set(w, h);
    }
  }
}
