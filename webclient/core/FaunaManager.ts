// webclient/core/FaunaManager.ts
import './global_types.ts';
import { Terrain } from './types.ts';
import {
  getObstacleRadius,
  Obstacle,
  resolveFaunaStep,
} from './CollisionEngine.ts';

const FAUNA_WIGGLE_THRESHOLD = 5.0;
const FAUNA_CULL_DISTANCE = 100.0;
const FAUNA_HEADING_MIN_SPEED = 0.05;
const FAUNA_HEADING_SMOOTHING = 0.4;
const FAUNA_TURN_RATE = 1.5;
const FAUNA_BREATH_AMPLITUDE = 0.02;
const FAUNA_BREATH_BASE_PERIOD = 4.0;
const FAUNA_BREATH_PERIOD_MIN = 0.5;
const FAUNA_BREATH_PERIOD_MAX = 6;

export class FaunaManager {
  public faunaAnchors = new Map<string, THREE.Vector3>();
  public faunaTypes = new Map<string, string>();
  public faunaTargets = new Map<string, THREE.Vector3>();
  public faunaRotations = new Map<string, number>();
  public faunaVel = new Map<string, THREE.Vector3>();
  public faunaBreathTime = new Map<string, number>();
  public faunaBreaths = new Map<string, number>();
  private interpMap = new Map<string, THREE.Vector3>();

  constructor() {}

  public clear(): void {
    this.faunaAnchors.clear();
    this.faunaTypes.clear();
    this.faunaTargets.clear();
    this.faunaRotations.clear();
    this.faunaVel.clear();
    this.faunaBreathTime.clear();
    this.faunaBreaths.clear();
    this.interpMap.clear();
  }

  public getRadius(id: string): number {
    const type = this.faunaTypes.get(id) || id;
    return getObstacleRadius(type);
  }

  private isCulled(
    anch: THREE.Vector3,
    avatarPos?: THREE.Vector3,
  ): boolean {
    return Boolean(
      avatarPos && (
        anch.distanceTo(avatarPos) > FAUNA_CULL_DISTANCE
      ),
    );
  }

  private stepVector(
    anch: THREE.Vector3,
    t: THREE.Vector3,
    dt: number,
  ): THREE.Vector3 {
    return t.add(
      new THREE.Vector3()
        .subVectors(anch, t)
        .normalize()
        .multiplyScalar(0.5 * dt),
    );
  }

  private stepFauna(
    anch: THREE.Vector3,
    t: THREE.Vector3,
    dt: number,
  ): THREE.Vector3 {
    if (t.distanceTo(anch) > FAUNA_WIGGLE_THRESHOLD) {
      return this.stepVector(anch, t, dt);
    }
    t.x += (Math.random() - 0.5) * 0.25 * dt;
    t.z += (Math.random() - 0.5) * 0.25 * dt;
    return t;
  }

  private smoothAngle(cur: number, target: number, dt: number) {
    let diff = target - cur;
    while (diff < -Math.PI) diff += Math.PI * 2;
    while (diff > Math.PI) diff -= Math.PI * 2;
    const maxStep = FAUNA_TURN_RATE * dt;
    const step = Math.max(-maxStep, Math.min(maxStep, diff));
    return cur + step;
  }

  private updateVelocity(
    id: string,
    vx: number,
    vz: number,
    dt: number,
  ): THREE.Vector3 {
    let vel = this.faunaVel.get(id);
    if (!vel) {
      vel = new THREE.Vector3(vx, 0, vz);
    } else {
      const k = 1 - Math.exp(-dt / FAUNA_HEADING_SMOOTHING);
      vel.multiplyScalar(1 - k).add(
        new THREE.Vector3(vx, 0, vz).multiplyScalar(k),
      );
    }
    this.faunaVel.set(id, vel);
    return vel;
  }

  private updateHeading(
    id: string,
    vel: THREE.Vector3,
    dt: number,
  ): void {
    if (vel.lengthSq() > FAUNA_HEADING_MIN_SPEED ** 2) {
      const target = Math.atan2(-vel.x, -vel.z);
      const cur = this.faunaRotations.get(id);
      const next = cur === undefined
        ? target
        : this.smoothAngle(cur, target, dt);
      this.faunaRotations.set(id, next);
    }
  }

  private hashFaunaId(id: string): number {
    const code = id.split('').reduce(
      (a, c) => (a * 31 + c.charCodeAt(0)) | 0,
      7,
    );
    return Math.abs(code);
  }

  private breathScale(
    id: string,
    radius: number,
    dt: number,
  ): number {
    const rawPeriod = FAUNA_BREATH_BASE_PERIOD * radius;
    const period = Math.max(
      FAUNA_BREATH_PERIOD_MIN,
      Math.min(FAUNA_BREATH_PERIOD_MAX, rawPeriod),
    );
    let t = (this.faunaBreathTime.get(id) ?? 0) + dt;
    if (t >= period) t -= period;
    this.faunaBreathTime.set(id, t);
    const cyclePos = t / period;
    const phase = cyclePos + (this.hashFaunaId(id) % 1000) / 1000;
    const curve = Math.sin(Math.PI * (phase % 1)) ** 2;
    return 1 + FAUNA_BREATH_AMPLITUDE * curve;
  }

  public update(
    dt: number,
    baseObs: Obstacle[],
    avatarPos?: THREE.Vector3,
  ): Map<string, THREE.Vector3> {
    this.interpMap.clear();
    this.faunaAnchors.forEach((anch, id) => {
      if (this.isCulled(anch, avatarPos)) return;
      let t = this.faunaTargets.get(id);
      if (!t) {
        t = anch.clone();
        this.faunaTargets.set(id, t);
      }
      const prevX = t.x;
      const prevZ = t.z;
      const rawStep = this.stepFauna(anch, t, dt);
      const safeStep = resolveFaunaStep(
        rawStep,
        this.getRadius(id),
        baseObs,
        id,
      );
      t.copy(safeStep);
      this.interpMap.set(id, safeStep);
      const effectiveDt = Math.max(dt, 1e-4);
      const vx = (safeStep.x - prevX) / effectiveDt;
      const vz = (safeStep.z - prevZ) / effectiveDt;
      const vel = this.updateVelocity(id, vx, vz, dt);
      this.updateHeading(id, vel, dt);
      const rad = this.getRadius(id);
      const breath = this.breathScale(id, rad, dt);
      this.faunaBreaths.set(id, breath);
    });
    return this.interpMap;
  }
}
