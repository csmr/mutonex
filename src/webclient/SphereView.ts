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

export class SphereView implements IView {
  public scene: any;
  public camera: any;
  public controls: any;

  private entityRenderer: EntityRenderer;
  private boundResize: () => void;
  public terrainMesh: any | null = null;

  constructor(domElement: HTMLCanvasElement) {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xeeeeee);

    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000,
    );
    this.camera.position.set(10, 1.7, 10);

    const ambientLight = new THREE.AmbientLight(
      0xffffff,
      0.6,
    );
    this.scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(
      0xffffff,
      0.8,
    );
    directionalLight.position.set(50, 50, 50);
    this.scene.add(directionalLight);

    this.controls = new FirstPersonControls(
      this.camera,
      domElement,
    );

    this.entityRenderer = new EntityRenderer(
      this.scene,
      (color: number) => new THREE.MeshBasicMaterial({ color }),
    );

    this.boundResize = this.onWindowResize.bind(this);
  }

  public updateTerrain(terrain: Terrain): void {
    if (this.terrainMesh) {
      this.scene.remove(this.terrainMesh);
      if (this.terrainMesh.geometry) {
        this.terrainMesh.geometry.dispose();
      }
    }
    this.terrainMesh = createTerrainMesh(terrain);
    this.scene.add(this.terrainMesh);
  }

  public updateEntities(entities: EntityData[]): void {
    this.entityRenderer.update(entities);
  }

  public update(deltaTime: number): void {
    this.controls.update();
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

  public onDeactivate(): void {
    window.removeEventListener(
      "resize",
      this.boundResize,
    );
    if (this.controls) {
      this.controls.enabled = false;
    }
  }

  public dispose(): void {
    if (this.controls) {
      this.controls.dispose();
    }
  }

  private onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
  }
}
