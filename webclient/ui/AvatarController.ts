import "../core/global_types.ts";
import { ViewManager } from "../core/ViewManager.ts";
import { GameStateProvider } from "../core/GameStateProvider.ts";
import { sampleTerrainHeight } from "../rendering/TerrainMesh.ts";

/**
 * Handles avatar movement, input, and state synchronization.
 */
export class AvatarController {
  private viewManager: ViewManager;
  private stateProvider: () => GameStateProvider | null;

  public position = new THREE.Vector3(10, 0, 10);
  private lastSent = new THREE.Vector3();
  private keys: { [key: string]: boolean } = {};

  // GC pre-allocations
  private moveDir = new THREE.Vector3();
  private forward = new THREE.Vector3();
  private right = new THREE.Vector3();
  private moveVec = new THREE.Vector3();
  private tempV = new THREE.Vector3(0, 0, -1);
  private tempR = new THREE.Vector3(1, 0, 0);

  public speed = 20.0;
  public heightOffset = 1.7; // Typical eye level

  constructor(
    viewManager: ViewManager,
    stateProvider: () => GameStateProvider | null,
  ) {
    this.viewManager = viewManager;
    this.stateProvider = stateProvider;

    window.addEventListener(
      "keydown",
      (e) => (this.keys[e.key.toLowerCase()] = true),
    );
    window.addEventListener(
      "keyup",
      (e) => (this.keys[e.key.toLowerCase()] = false),
    );
  }

  public update(delta: number) {
    const provider = this.stateProvider();
    if (!provider || provider.phase !== "gamein") return;

    this.calculateDirection();

    if (this.moveDir.lengthSq() > 0) {
      this.moveDir.normalize();
      this.moveVec.copy(this.moveDir).multiplyScalar(
        this.speed * delta,
      );

      this.position.add(this.moveVec);
    }

    // Always snap to terrain height if available
    const view = this.viewManager.getActiveView();
    if (view) {
      let terrainY = 0;
      if (view.terrainMesh) {
        terrainY = sampleTerrainHeight(
          view.terrainMesh,
          this.position.x,
          this.position.z,
        );
      }
      this.position.y = terrainY;
      view.camera.position.copy(this.position);
      view.camera.position.y += this.heightOffset;
    }

    if (this.moveDir.lengthSq() > 0) {
      this.syncState(provider);
    }
  }

  private calculateDirection() {
    this.moveDir.set(0, 0, 0);
    const view = this.viewManager.getActiveView();
    if (!view) return;

    const cam = view.camera;
    this.forward.copy(this.tempV).applyQuaternion(
      cam.quaternion,
    );
    this.forward.y = 0;
    this.forward.normalize();

    this.right.copy(this.tempR).applyQuaternion(
      cam.quaternion,
    );
    this.right.y = 0;
    this.right.normalize();

    if (this.keys["w"] || this.keys["arrowup"]) {
      this.moveDir.add(this.forward);
    }
    if (this.keys["s"] || this.keys["arrowdown"]) {
      this.moveDir.sub(this.forward);
    }
    if (this.keys["a"] || this.keys["arrowleft"]) {
      this.moveDir.sub(this.right);
    }
    if (this.keys["d"] || this.keys["arrowright"]) {
      this.moveDir.add(this.right);
    }
  }

  private syncState(provider: GameStateProvider) {
    if (this.position.distanceTo(this.lastSent) > 1.0) {
      provider.sendAvatarPosition([
        this.position.x,
        this.position.y,
        this.position.z,
      ]);
      this.lastSent.copy(this.position);
    }
  }

  public getForwardVector(): THREE.Vector3 {
    return this.forward.clone();
  }

  public isPressed(key: string): boolean {
    return !!this.keys[key.toLowerCase()];
  }
}
