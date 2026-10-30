// webclient/core/LidarAudio.ts
import './global_types.ts';

export const LIDAR_AUDIO_CONFIG = {
  pingIntervalMs: 5000,
  maxRange: 30.0,
  minRange: 1.0,
  maxFreqHz: 987.77, // B5 note at dist <= 1m
  minFreqHz: 783.99, // G5 note at dist >= 30m
  maxVolume: 0.15, // near volume
  minVolume: 0.02, // far volume
};

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

export function calcPitchAndVol(
  dist: number,
  cfg = LIDAR_AUDIO_CONFIG,
): { freq: number; vol: number } {
  const range = cfg.maxRange - cfg.minRange;
  const clamped = Math.max(
    cfg.minRange,
    Math.min(cfg.maxRange, dist),
  );
  const t = (cfg.maxRange - clamped) / range;
  const freq = cfg.minFreqHz + t * (cfg.maxFreqHz - cfg.minFreqHz);
  const vol = cfg.minVolume + t * (cfg.maxVolume - cfg.minVolume);
  return { freq, vol };
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
  public lastPingMs = 0;

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

  public playPing(pan: number, freq: number, vol: number): void {
    if (!this.enabled) return;
    const ctx = this.initCtx();
    if (!ctx) return;
    if (ctx.state === 'suspended' && ctx.resume) ctx.resume();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const t = ctx.currentTime;
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
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
    osc.stop(t + 0.12);
  }

  public update(
    camPos: THREE.Vector3,
    camRight: THREE.Vector3,
    entities: { id: string; pos: THREE.Vector3; charm?: number }[],
    nowMs = performance.now(),
    cfg = LIDAR_AUDIO_CONFIG,
  ): void {
    if (!this.enabled) return;
    if (nowMs - this.lastPingMs < cfg.pingIntervalMs) return;
    const target = this.findNearestCharmable(camPos, entities, cfg);
    if (!target) return;
    this.lastPingMs = nowMs;
    const pan = calcPan(camPos, camRight, target.pos);
    const { freq, vol } = calcPitchAndVol(target.dist, cfg);
    this.playPing(pan, freq, vol);
  }

  private findNearestCharmable(
    camPos: THREE.Vector3,
    entities: { id: string; pos: THREE.Vector3; charm?: number }[],
    cfg: typeof LIDAR_AUDIO_CONFIG,
  ) {
    let nearest: { pos: THREE.Vector3; dist: number } | null = null;
    entities.forEach((e) => {
      if (!e.charm || e.charm <= 0) return;
      const dist = camPos.distanceTo(e.pos);
      if (dist > cfg.maxRange) return;
      if (!nearest || dist < nearest.dist) {
        nearest = { pos: e.pos, dist };
      }
    });
    return nearest;
  }
}
