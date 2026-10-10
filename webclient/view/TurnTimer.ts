// webclient/view/TurnTimer.ts

import { DEFAULTS, Rules } from '../core/GameRules.ts';

declare const THREE: typeof import('three');

// Design & Game Feature Parameters
export const ACTIVE_COLOR_HEX = 0x00ff66;
export const TRACK_COLOR_HEX = 0x8b4500;
export const TIMER_RADIUS = 15;
export const RING_SEGMENTS = 64;
export const MARGIN_X = 35;
export const MARGIN_Y = 35;
export const STEP_MS = 500;

const VERTEX_SHADER = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const FRAGMENT_SHADER = `
uniform float uProgress;
uniform vec3 uActiveColor;
uniform vec3 uTrackColor;
varying vec2 vUv;
void main() {
  vec2 uv = vUv - 0.5;
  float angle = atan(uv.x, uv.y) + 3.14159265;
  float normalizedAngle = angle / (2.0 * 3.14159265);
  vec3 col = (normalizedAngle <= uProgress)
    ? uActiveColor
    : uTrackColor;
  gl_FragColor = vec4(col, 1.0);
}
`;

/**
 * Renders an orthographic HUD turn timer in top-right screen space.
 * Uses a static RingGeometry and GPU progress sweep shader for 0 CPU overhead.
 */
export class TurnTimer {
  public hudScene: any;
  public hudCamera: any;
  public clockMesh: any;
  public clockMat: any;
  public timerDuration = 0;
  public timerStart = 0;
  public isTimerActive = false;
  private rules: Rules = DEFAULTS;
  private progressUniform: { value: number } | null = null;

  constructor() {
    if (typeof THREE === 'undefined') return;
    this.hudScene = new THREE.Scene();
    this.hudCamera = this.createCamera();
    this.clockMat = this.createMaterial();
    this.clockMesh = this.createMesh();
    this.hudScene.add(this.clockMesh);
    this.updateCanvasSize(window.innerWidth, window.innerHeight);
  }

  public setRules(rules: Rules): void {
    this.rules = rules;
    if (rules.turnIntervalMs <= 0) {
      this.isTimerActive = false;
      if (this.clockMesh) this.clockMesh.visible = false;
    }
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

  private buildUniforms(): any {
    return {
      uProgress: { value: 1.0 },
      uActiveColor: {
        value: new THREE.Color(ACTIVE_COLOR_HEX),
      },
      uTrackColor: {
        value: new THREE.Color(TRACK_COLOR_HEX),
      },
    };
  }

  private createMaterial(): any {
    const uniforms = this.buildUniforms();
    const mat = new THREE.ShaderMaterial({
      uniforms,
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      transparent: true,
      side: THREE.DoubleSide,
    });
    this.progressUniform = mat.uniforms.uProgress;
    return mat;
  }

  private createMesh(): any {
    const geo = new THREE.RingGeometry(
      0,
      TIMER_RADIUS,
      RING_SEGMENTS,
    );
    const mesh = new THREE.Mesh(geo, this.clockMat);
    mesh.visible = false;
    return mesh;
  }

  public updateCanvasSize(w: number, h: number): void {
    if (!this.hudCamera || !this.clockMesh) return;
    this.hudCamera.left = -w / 2;
    this.hudCamera.right = w / 2;
    this.hudCamera.top = h / 2;
    this.hudCamera.bottom = -h / 2;
    this.hudCamera.updateProjectionMatrix();
    const px = w / 2 - MARGIN_X;
    const py = h / 2 - MARGIN_Y;
    this.clockMesh.position.set(px, py, 0);
  }

  private resetVisualState(dur: number): void {
    this.timerDuration = dur;
    this.timerStart = performance.now();
    this.isTimerActive = true;
    if (this.clockMesh) this.clockMesh.visible = true;
    if (this.progressUniform) {
      this.progressUniform.value = 1.0;
    }
  }

  public startTimer(durationMs?: number): void {
    const dur = durationMs ?? this.rules.turnIntervalMs;
    if (dur <= 0) {
      this.isTimerActive = false;
      if (this.clockMesh) this.clockMesh.visible = false;
      return;
    }
    this.resetVisualState(dur);
  }

  private updateProgressUniform(elapsed: number): void {
    const stepped = Math.floor(elapsed / STEP_MS) * STEP_MS;
    if (this.progressUniform) {
      this.progressUniform.value = 1.0 -
        (stepped / this.timerDuration);
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
    this.updateProgressUniform(elapsed);
  }

  public render(renderer: any): void {
    if (!this.isTimerActive || !renderer) return;
    const prevAutoClear = renderer.autoClear;
    renderer.autoClear = false;
    renderer.clearDepth();
    renderer.render(this.hudScene, this.hudCamera);
    renderer.autoClear = prevAutoClear;
  }

  public dispose(): void {}
}
