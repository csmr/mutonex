import "./global_types.ts";
import { IView } from "./ViewManager.ts";
import {
  FirstPersonControls
} from "./FirstPersonControls.ts";
import { EntityRenderer } from "./EntityRenderer.ts";
import { createTerrainMesh } from "./TerrainMesh.ts";
import {
  EntityData,
  Terrain
} from "./types.ts";
import {
  LidarFragmentShader,
  LidarVertexShader,
  ProceduralMeshVertexShader,
  ProceduralMeshFragmentShader
} from "./LidarShaders.ts";

import { LidarStyleConfig, LidarStyles } from "./LidarStyles.ts";

export class LidarView implements IView {
  public scene: any; // THREE.Scene
  public camera: any; // THREE.PerspectiveCamera

  // Dot Rendering Parameters
  public currentStyleName: string = "pointCloud";
  public dotRadiusMin = 1.0; // Radius for objects far away (vDist >= 30.0)
  public dotRadiusMax = 4.0; // Radius for objects very close (vDist == 0.0)
  public dotType = 1.0; // 0.0 = square, 1.0 = circular

  private samplesH = 480;
  private samplesV = 300;
  public entropy: number = 0.1; // Parametric signal loss (0=no noise, 1=max)

  // The "Virtual" scene contains the actual geometry
  private virtualScene: any; // THREE.Scene
  private entityRenderer: EntityRenderer;

  private renderTarget: any;
  private baseMaterials: Map<number, any> = new Map();

  public controls: any;
  private renderer: any | null = null;
  private boundResize: () => void;

  private loader: any;
  private lidarMaterial: any;
  private lidarPoints: any;

  private modelCache: Map<string, any> = new Map();
  private isRebuildingBuffer = false;
  private pendingStyleConfig: string | null = null;
  public terrainMesh: any | null = null;

  constructor(domElement: HTMLCanvasElement) {
    this.initMainScene(domElement);
    this.initVirtualScene();
    this.initRenderTarget();

    this.entityRenderer = new EntityRenderer(
      this.virtualScene,
      (color: number) => this.getLidarBaseMaterial(color),
    );

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
    this.camera = new THREE.PerspectiveCamera(
      75,
      w / h,
      0.1,
      1000,
    );

    // FPV start pos
    this.camera.position.set(10, 1.7, 10);

    this.controls = new FirstPersonControls(
      this.camera,
      domElement,
    );
  }

  private initVirtualScene() {
    this.virtualScene = new THREE.Scene();
    this.virtualScene.background = new THREE.Color(0x000000);

    // TEST SPHERE: Remove after terrain rendering confirmed.
    const debugGeo = new THREE.SphereGeometry(1.5, 16, 16);
    const debugMat = this.getLidarBaseMaterial(0xff0000);
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

    // FloatType allows full-precision Color (RGB) + Depth (Alpha).
  }

  private getLidarBaseMaterial(colorHex: number): any {
    let mat = this.baseMaterials.get(colorHex);
    if (!mat) {
      mat = new THREE.ShaderMaterial({
        uniforms: {
          far: { value: this.camera.far },
          uColor: { value: new THREE.Color(colorHex) },
          uProceduralMode: { value: 0.0 },
          time: { value: 0.0 }
        },
        vertexShader: ProceduralMeshVertexShader,
        fragmentShader: ProceduralMeshFragmentShader,
      });
      this.baseMaterials.set(colorHex, mat);
    }
    return mat;
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

    const isProcedural = styleName === 'proceduralLidar';

    // Toggle active rendering tree
    if (isProcedural) {
      this.scene.add(this.virtualScene);
      if (this.lidarPoints) this.lidarPoints.visible = false;
    } else {
      this.scene.remove(this.virtualScene);
      if (this.lidarPoints) this.lidarPoints.visible = true;
    }

    // Toggle base material execution mode
    for (const mat of this.baseMaterials.values()) {
      mat.uniforms.uProceduralMode.value = isProcedural ? 1.0 : 0.0;
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

  private *chunkedGeometryGenerator(
    samplesH: number,
    samplesV: number,
  ): Generator<void, any, void> {
    const geometry = new THREE.BufferGeometry();

    // Unconnected Point Cloud
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

    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));

    const newGeometryGroup = new THREE.Points(geometry, this.lidarMaterial);
    newGeometryGroup.frustumCulled = false;

    return newGeometryGroup;
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
      projectionInverse: {
        value: new THREE.Matrix4(),
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
      dotRadiusMax: { value: this.dotRadiusMax },
    };

    return new THREE.ShaderMaterial({
      uniforms: uniforms,
      vertexShader: LidarVertexShader,
      fragmentShader: LidarFragmentShader,
      transparent: true,
      depthWrite: false, // Task 6: Disable depthWrite to fix occlusion sorting with AdditiveBlending
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

  public updateEntities(entities: EntityData[], localPlayerId?: string) {
    const filtered = localPlayerId ? entities.filter(e => e.id !== localPlayerId) : entities;
    this.entityRenderer.update(filtered);
  }

  private createGroundGrid() {
    const geo = new THREE.PlaneGeometry(
      200,
      200,
      100,
      100,
    );
    const mat = this.getLidarBaseMaterial(0x333333);
    const plane = new THREE.Mesh(geo, mat);
    plane.rotation.x = -Math.PI / 2;
    this.virtualScene.add(plane);
  }

  public onActivate(): void {
    window.addEventListener(
      "resize",
      this.boundResize,
    );
    if (this.controls) {
      this.controls.enabled = true;
    }
  }

  public onDeactivate(): void { }

  public getInteractableObjects(): any[] {
    return this.virtualScene.children;
  }

  public dispose(): void {
    window.removeEventListener(
      "resize",
      this.boundResize,
    );
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

    // Fast-path bypass for Procedural Lidar (Native occulusion rendering)
    if (this.currentStyleName === 'proceduralLidar') {
      for (const mat of this.baseMaterials.values()) {
        mat.uniforms.far.value = this.camera.far;
      }
      return;
    }

    const uniforms = this.lidarMaterial.uniforms;

    // Bind the colour texture (which contains depth-packed data) to tDepth.
    uniforms.tDepth.value = this.renderTarget.texture;
    uniforms.cameraNear.value = this.camera.near;
    uniforms.cameraFar.value = this.camera.far;

    const projInv = this.camera.projectionMatrixInverse;
    uniforms.projectionInverse.value.copy(projInv);
    const mw = this.camera.matrixWorld;
    uniforms.viewInverse.value.copy(mw);

    // Depth & Color pass: render virtualScene with
    // intrinsic LidarBaseMaterials.
    // Background clear sets Alpha (depth) to 1.0
    // and RGB to 0.0 (black sky).
    const currentRT = renderer.getRenderTarget();
    renderer.setRenderTarget(this.renderTarget);
    renderer.setClearColor(0x000000, 1.0);
    renderer.clear();

    for (const mat of this.baseMaterials.values()) {
      mat.uniforms.far.value = this.camera.far;
    }

    const prevBackground = this.virtualScene.background;
    this.virtualScene.background = null; // let explicit clear stand
    renderer.render(this.virtualScene, this.camera);
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
