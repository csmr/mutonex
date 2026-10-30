// webclient/core/LidarAudio.ts
import './global_types.ts';

export function calcPan(
  camPos: THREE.Vector3,
  camRight: THREE.Vector3,
  targetPos: THREE.Vector3,
): number {
  const dx = targetPos.x - camPos.x;
  const dz = targetPos.z - camPos.z;
  const len = Math.hypot(dx, dz);
  if (len < 0.001) return 0;
  const nx = dx / len;
  const nz = dz / len;
  const dot = nx * camRight.x + nz * camRight.z;
  return Math.max(-1, Math.min(1, dot));
}

export interface AudioCtxLike {
  state: string;
  resume?: () => Promise<void>;
  currentTime: number;
  destination: any;
  createOscillator: () => any;
  createGain: () => any;
  createStereoPanner?: () => any;
}

export class LidarAudio {
  public ctx: AudioCtxLike | null = null;
  public enabled = true;
  public maxRange = 30.0;
  public cooldownMs = 800;
  private cooldowns = new Map<string, number>();

  constructor(ctx?: AudioCtxLike) {
    this.ctx = ctx || null;
  }

  private initCtx(): AudioCtxLike | null {
    if (this.ctx) return this.ctx;
    const ctor = (window as any).AudioContext ||
      (window as any).webkitAudioContext;
    if (!ctor) return null;
    this.ctx = new ctor();
    return this.ctx;
  }

  public playPing(pan: number, freq = 905): void {
    if (!this.enabled) return;
    const ctx = this.initCtx();
    if (!ctx) return;
    if (ctx.state === 'suspended' && ctx.resume) ctx.resume();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const t = ctx.currentTime;
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(
      freq * 0.5,
      t + 0.08,
    );
    gain.gain.setValueAtTime(0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    this.connectAndStart(osc, gain, pan, t);
  }

  private connectAndStart(
    osc: any,
    gain: any,
    pan: number,
    t: number,
  ): void {
    const ctx = this.ctx;
    if (!ctx) return;
    if (ctx.createStereoPanner) {
      const panner = ctx.createStereoPanner();
      panner.pan.setValueAtTime(pan, t);
      osc.connect(gain);
      gain.connect(panner);
      panner.connect(ctx.destination);
    } else {
      osc.connect(gain);
      gain.connect(ctx.destination);
    }
    osc.start(t);
    osc.stop(t + 0.08);
  }

  public update(
    camPos: THREE.Vector3,
    camRight: THREE.Vector3,
    entities: { id: string; pos: THREE.Vector3; charm?: number }[],
    nowMs = performance.now(),
  ): void {
    entities.forEach((ent) => {
      if (!this.isCharmable(ent)) return;
      const dist = camPos.distanceTo(ent.pos);
      if (dist > this.maxRange) return;
      const last = this.cooldowns.get(ent.id) || 0;
      if (nowMs - last < this.cooldownMs) return;
      this.cooldowns.set(ent.id, nowMs);
      const pan = calcPan(camPos, camRight, ent.pos);
      this.playPing(pan);
    });
  }

  private isCharmable(
    ent: { id: string; charm?: number },
  ): boolean {
    return Boolean(ent.charm && ent.charm > 0);
  }
}
