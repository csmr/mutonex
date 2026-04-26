import "./global_types.ts";

/**
 * Drag-to-look FPV controller.
 */
export class FirstPersonControls {
  public camera: any;
  public domElement: HTMLElement;
  public enabled = false; // Disabled by default
  public lookSpeed = 0.002;

  private yaw = 0;
  private pitch = 0;
  private isMouseDown = false;

  private onDown = () => (this.isMouseDown = true);
  private onUp = () => (this.isMouseDown = false);
  private onMove = (e: MouseEvent) => this.handleMove(e);

  constructor(camera: any, domElement: HTMLElement) {
    this.camera = camera;
    this.domElement = domElement;

    this.domElement.addEventListener("mousedown", this.onDown);
    window.addEventListener("mouseup", this.onUp);
    window.addEventListener("mousemove", this.onMove);

    this.yaw = this.camera.rotation.y;
    this.pitch = this.camera.rotation.x;
  }

  private handleMove(e: MouseEvent) {
    if (!this.enabled || !this.isMouseDown) return;

    this.yaw -= e.movementX * this.lookSpeed;
    this.pitch -= e.movementY * this.lookSpeed;

    const limit = Math.PI / 2 - 0.05;
    this.pitch = Math.max(-limit, Math.min(limit, this.pitch));

    this.camera.rotation.order = "YXZ";
    this.camera.rotation.y = this.yaw;
    this.camera.rotation.x = this.pitch;
  }

  public update() {}

  public dispose() {
    this.domElement.removeEventListener(
      "mousedown",
      this.onDown,
    );
    window.removeEventListener("mouseup", this.onUp);
    window.removeEventListener("mousemove", this.onMove);
  }
}
