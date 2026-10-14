import '../core/global_types.ts';
import { IView } from '../core/ViewManager.ts';
import { FirstPersonControls } from '../input/FirstPersonControls.ts';
import { EntityRenderer } from '../render/EntityRenderer.ts';
import { createTerrainMesh } from '../render/TerrainMesh.ts';
import { EntityData, Terrain } from '../core/types.ts';
import {
  LidarFragmentShader,
  LidarVertexShader,
  ProceduralMeshFragmentShader,
  ProceduralMeshVertexShader,
} from '../render/LidarShaders.ts';
import {
  LidarStyleConfig,
  LidarStyles,
} from '../render/LidarStyles.ts';
import { deriveUniforms } from '../render/StyleUniforms.ts';
import { OutlinePass } from '../render/OutlinePass.ts';
import { ScanGrid } from '../render/ScanGrid.ts';

const DebugKeys: Record<string, (v: LidarView) => void> = {
  k: (v) => v.outlinePass.cycleShaderMode(),
  l: (v) => v.cycleStyle(),
  j: (v) => v.outlinePass.adjustGapMeters(-0.1),
  h: (v) => v.outlinePass.adjustGapMeters(0.1),
};

export class LidarView implements IView {
  public scene: any;
  public camera: any;
  public currentStyleName = 'pointCloud';
  public entropy = 0.1;
  public controls: any;
  public terrainMesh: any | null = null;
  public raycastEnabled = true;

  private virtualScene: any;
  private entityRenderer: EntityRenderer;
  public outlinePass: OutlinePass;
  private scanGrid: ScanGrid;
  private baseMaterials: Map<number, any> = new Map();
  public lidarMaterial: any;

  private boundResize: () => void;
  private boundKeyDown: (e: KeyboardEvent) => void;

  constructor(domElement: HTMLCanvasElement) {
    this.initScenes(domElement);
    this.entityRenderer = new EntityRenderer(
      this.virtualScene,
      (color: number) => this.getLidarBaseMaterial(color),
    );

    this.outlinePass = new OutlinePass(
      this.camera.far,
      LidarStyles.pointCloud.outline,
    );

    this.lidarMaterial = this.createLidarShader();
    this.scanGrid = new ScanGrid(this.scene, this.lidarMaterial);

    this.createGroundGrid();
    this.setLidarStyle('pointCloud');

    this.boundResize = this.onWindowResize.bind(this);
    this.boundKeyDown = (e: KeyboardEvent) => {
      const handler = DebugKeys[e.key.toLowerCase()];
      if (handler) handler(this);
    };
  }

  private initScenes(domElement: HTMLCanvasElement) {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x050100);

    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(75, w / h, 0.1, 1000);
    this.camera.position.set(10, 1.7, 10);
    this.controls = new FirstPersonControls(
      this.camera,
      domElement,
    );

    this.virtualScene = new THREE.Scene();
    this.virtualScene.background = new THREE.Color(0x000000);

    const debugGeo = new THREE.SphereGeometry(1.5, 16, 16);
    const debugMat = this.getLidarBaseMaterial(0xff0000);
    const debugMesh = new THREE.Mesh(debugGeo, debugMat);
    debugMesh.position.set(10, 1.5, 3);
    this.virtualScene.add(debugMesh);
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

  public cycleStyle(): void {
    const styleNames = Object.keys(LidarStyles);
    const idx = styleNames.indexOf(this.currentStyleName);
    const nextIdx = (idx + 1) % styleNames.length;
    this.setLidarStyle(styleNames[nextIdx]);
  }

  public setLidarStyle(styleName: string) {
    const config = LidarStyles[styleName] || LidarStyles.pointCloud;
    this.currentStyleName = styleName;
    console.log(`LidarView style set to: ${styleName}`);

    const uniforms = deriveUniforms(config);
    if (this.lidarMaterial) {
      const u = this.lidarMaterial.uniforms;
      u.scanMode.value = uniforms.scanMode;
      u.dotType.value = uniforms.dotType;
      u.beamMode.value = uniforms.beamMode;
      u.beamStep.value = uniforms.beamStep;
      u.beamWidth.value = uniforms.beamWidth;
      u.dotRadiusMin.value = uniforms.dotRadiusMin;
      u.dotRadiusMax.value = uniforms.dotRadiusMax;
    }

    this.outlinePass.updateUniforms(config.outline);
    const isProcedural = config.pipeline === 'procedural';

    if (isProcedural) {
      this.scene.add(this.virtualScene);
      this.scanGrid.setVisible(false);
    } else {
      this.scene.remove(this.virtualScene);
      this.scanGrid.setVisible(true);
    }

    for (const mat of this.baseMaterials.values()) {
      mat.uniforms.uProceduralMode.value = isProcedural ? 1.0 : 0.0;
    }

    this.scanGrid.rebuild(config);
  }

  private createLidarShader(): any {
    const resolution = new THREE.Vector2(
      window.innerWidth,
      window.innerHeight,
    );
    const cfg = LidarStyles[this.currentStyleName];
    const u = deriveUniforms(cfg);

    return new THREE.ShaderMaterial({
      uniforms: {
        tDepth: { value: null },
        cameraNear: { value: 0.1 },
        cameraFar: { value: 1000.0 },
        viewInverse: { value: new THREE.Matrix4() },
        projectionInverse: { value: new THREE.Matrix4() },
        resolution: { value: resolution },
        time: { value: 0 },
        scanMode: { value: u.scanMode },
        entropy: { value: this.entropy },
        diagMode: { value: 0.0 },
        dotType: { value: u.dotType },
        dotRadiusMin: { value: u.dotRadiusMin },
        dotRadiusMax: { value: u.dotRadiusMax },
        beamMode: { value: u.beamMode },
        beamStep: { value: u.beamStep },
        beamWidth: { value: u.beamWidth },
      },
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
    this.outlinePass.dispose();
    this.scanGrid.dispose();
  }

  public update(deltaTime: number): void {
    this.controls.update();
    if (this.lidarMaterial) {
      const u = this.lidarMaterial.uniforms;
      u.time.value += deltaTime;
      if (u.entropy) u.entropy.value = this.entropy;
    }
    for (const mat of this.baseMaterials.values()) {
      mat.uniforms.time.value += deltaTime;
    }
    this.virtualScene.updateMatrixWorld(true);
  }

  public preRender(renderer: any): void {
    for (const mat of this.baseMaterials.values()) {
      mat.uniforms.far.value = this.camera.far;
    }

    this.outlinePass.preRender(
      renderer,
      this.virtualScene,
      this.camera,
    );

    if (this.currentStyleName !== 'proceduralLidar') {
      const uniforms = this.lidarMaterial.uniforms;
      uniforms.tDepth.value = this.outlinePass.renderTarget.texture;
      uniforms.cameraNear.value = this.camera.near;
      uniforms.cameraFar.value = this.camera.far;
      uniforms.projectionInverse.value.copy(
        this.camera.projectionMatrixInverse,
      );
      uniforms.viewInverse.value.copy(this.camera.matrixWorld);
    }
  }

  public postRender(renderer: any): void {
    this.outlinePass.postRender(renderer, this.camera);
  }

  private onWindowResize(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.outlinePass.setSize(w, h);
    if (this.lidarMaterial) {
      this.lidarMaterial.uniforms.resolution.value.set(w, h);
    }
  }
}
