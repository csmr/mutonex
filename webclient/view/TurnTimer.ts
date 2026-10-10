// webclient/view/TurnTimer.ts

declare const THREE: typeof import('three');

const VERTEX_SHADER = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const FRAGMENT_SHADER = `
uniform float uProgress;
uniform vec3 uColor;
varying vec2 vUv;
void main() {
  vec2 uv = vUv - 0.5;
  float angle = atan(uv.x, uv.y) + 3.14159265;
  float normalizedAngle = angle / (2.0 * 3.14159265);
  if (normalizedAngle > uProgress) {
    discard;
  }
  gl_FragColor = vec4(uColor, 1.0);
}
`;

const TIMER_RADIUS = 15;
const MARGIN = 35;
const STEP_MS = 500;

export class TurnTimer {
  public hudScene: any;
  public hudCamera: any;
  public clockMesh: any;
  public clockMat: any;
  public timerDuration = 0;
  public timerStart = 0;
  public isTimerActive = false;
  private progressUniform: { value: number } | null = null;
  private boundResize: () => void;

  constructor() {
    this.boundResize = () => this.onWindowResize();
    if (typeof THREE === 'undefined') return;
    this.hudScene = new THREE.Scene();
    this.hudCamera = this.createCamera();
    this.clockMat = this.createMaterial();
    this.clockMesh = this.createMesh();
    this.hudScene.add(this.clockMesh);
    window.addEventListener('resize', this.boundResize);
    this.updatePosition();
  }

  private createCamera(): any {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const cam = new THREE.OrthographicCamera(
      -w / 2,
      w / 2,
      h / 2,
      -h / 2,
      0.1,
      10,
    );
    cam.position.z = 1;
    return cam;
  }

  private createMaterial(): any {
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uProgress: { value: 1.0 },
        uColor: { value: new THREE.Color(0x00ff66) },
      },
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      transparent: true,
      side: THREE.DoubleSide,
    });
    this.progressUniform = mat.uniforms.uProgress;
    return mat;
  }

  private createMesh(): any {
    const geo = new THREE.RingGeometry(0, TIMER_RADIUS, 64);
    const mesh = new THREE.Mesh(geo, this.clockMat);
    mesh.visible = false;
    return mesh;
  }

  private updatePosition(): void {
    if (!this.clockMesh) return;
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.clockMesh.position.set(w / 2 - MARGIN, h / 2 - MARGIN, 0);
  }

  private onWindowResize(): void {
    if (!this.hudCamera) return;
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.hudCamera.left = -w / 2;
    this.hudCamera.right = w / 2;
    this.hudCamera.top = h / 2;
    this.hudCamera.bottom = -h / 2;
    this.hudCamera.updateProjectionMatrix();
    this.updatePosition();
  }

  public startTimer(durationMs: number): void {
    this.timerDuration = durationMs;
    this.timerStart = performance.now();
    this.isTimerActive = true;
    if (this.clockMesh) this.clockMesh.visible = true;
    if (this.progressUniform) {
      this.progressUniform.value = 1.0;
    }
  }

  public update(): void {
    if (!this.isTimerActive) return;
    const elapsed = performance.now() - this.timerStart;
    if (elapsed >= this.timerDuration) {
      this.isTimerActive = false;
      if (this.clockMesh) this.clockMesh.visible = false;
      return;
    }
    const stepped = Math.floor(elapsed / STEP_MS) * STEP_MS;
    if (this.progressUniform) {
      this.progressUniform.value = 1.0 -
        (stepped / this.timerDuration);
    }
  }

  public render(renderer: any): void {
    if (!this.isTimerActive || !renderer) return;
    const prevAutoClear = renderer.autoClear;
    renderer.autoClear = false;
    renderer.clearDepth();
    renderer.render(this.hudScene, this.hudCamera);
    renderer.autoClear = prevAutoClear;
  }

  public dispose(): void {
    window.removeEventListener('resize', this.boundResize);
  }
}
