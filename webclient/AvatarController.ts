import "./global_types.ts";
import { ViewManager } from "./ViewManager.ts";
import { GameStateProvider } from "./GameStateProvider.ts";
import { sampleTerrainHeight } from "./TerrainMesh.ts";
import { KeyState, isActionActive } from "./ShortcutEngine.ts";

/**
 * Handles avatar movement, input, and state synchronization.
 */
export class AvatarController {
  private viewManager: ViewManager;
  private stateProvider: () => GameStateProvider | null;
  private getKeyState: () => KeyState;

  public position = new THREE.Vector3(10, 0, 10);
  private lastSentPosition = new THREE.Vector3();

  // GC pre-allocations
  private moveDirection = new THREE.Vector3();
  private forward = new THREE.Vector3();
  private right = new THREE.Vector3();
  private moveVector = new THREE.Vector3();
  private tempVector = new THREE.Vector3(0, 0, -1);
  private tempRight = new THREE.Vector3(1, 0, 0);

  public speed = 20.0;
  public heightOffset = 1.7; // Typical eye level

  constructor(
    viewManager: ViewManager,
    stateProvider: () => GameStateProvider | null,
    getKeyState: () => KeyState,
  ) {
    this.viewManager = viewManager;
    this.stateProvider = stateProvider;
    this.getKeyState = getKeyState;
  }

  public update(delta: number) {
    const provider = this.stateProvider();
    const activeView = this.viewManager.getActiveView();
    if (!provider || provider.phase !== "gamein") return;
    if ((activeView as any)?.isGlobeView) return; // Guard globe

    this.calculateDirection();

    if (this.moveDirection.lengthSq() > 0) {
      this.moveDirection.normalize();
      this.moveVector.copy(this.moveDirection).multiplyScalar(this.speed * delta);
      this.position.add(this.moveVector);
    }

    this.updateCamera();

    if (this.moveDirection.lengthSq() > 0) {
      this.syncState(provider);
    }
  }

  private updateCamera() {
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
  }

  private calculateDirection() {
    this.moveDirection.set(0, 0, 0);
    const view = this.viewManager.getActiveView();
    if (!view) return;

    const cam = view.camera;
    this.forward.copy(this.tempVector).applyQuaternion(cam.quaternion);
    this.forward.y = 0;
    this.forward.normalize();

    this.right.copy(this.tempRight).applyQuaternion(cam.quaternion);
    this.right.y = 0;
    this.right.normalize();

    const keyState = this.getKeyState();
    if (isActionActive(keyState, "move_fwd")) this.moveDirection.add(this.forward);
    if (isActionActive(keyState, "move_back")) this.moveDirection.sub(this.forward);
    if (isActionActive(keyState, "move_left")) this.moveDirection.sub(this.right);
    if (isActionActive(keyState, "move_right")) this.moveDirection.add(this.right);
  }

  private syncState(provider: GameStateProvider) {
    if (this.position.distanceTo(this.lastSentPosition) > 1.0) {
      provider.sendAvatarPosition([
        this.position.x,
        this.position.y,
        this.position.z,
      ]);
      this.lastSentPosition.copy(this.position);
    }
  }

  public getForwardVector(): THREE.Vector3 {
    return this.forward.clone();
  }
}
