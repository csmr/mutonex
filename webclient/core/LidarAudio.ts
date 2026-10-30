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

export function evaluateAudioEntropy(
  entropy: number,
  roll = Math.random(),
): 'normal' | 'drop' | 'noise' {
  if (entropy <= 0) return 'normal';
  if (roll < entropy * 0.35) return 'drop';
  if (roll < entropy * 0.70) return 'noise';
  return 'normal';
}

export function createNoiseBuffer(
  ctx: any,
  duration = 0.12,
): any {
  if (!ctx?.createBuffer) return null;
  const rate = ctx.sampleRate || 44100;
  const buf = ctx.createBuffer(1, (rate * duration) | 0, rate);
  const data = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < data.length; i++) {
    last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
    data[i] = last * 3.5;
  }
  return buf;
}

function connectAndStartNode(
  ctx: any,
  node: any,
  gain: any,
  pan: number,
  t: number,
  duration = 0.12,
): void {
  if (ctx.createStereoPanner) {
    const panner = ctx.createStereoPanner();
    panner.pan.setValueAtTime(pan, t);
    node.connect(gain);
    gain.connect(panner);
    panner.connect(ctx.destination);
  } else {
    node.connect(gain);
    gain.connect(ctx.destination);
  }
  node.start(t);
  if (node.stop) node.stop(t + duration);
}

export interface AudioCtxLike {
  state: string;
  resume?: () => Promise<void>;
  currentTime: number;
  sampleRate?: number;
  destination: any;
  createOscillator: () => any;
  createGain: () => any;
  createBuffer?: (ch: number, len: number, rate: number) => any;
  createBufferSource?: () => any;
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
    connectAndStartNode(ctx, osc, gain, pan, t, 0.12);
  }

  public playNoisePing(pan: number, vol: number): void {
    if (!this.enabled) return;
    const ctx = this.initCtx();
    if (!ctx) return;
    if (ctx.state === 'suspended' && ctx.resume) ctx.resume();
    const buf = createNoiseBuffer(ctx, 0.12);
    if (!buf || !ctx.createBufferSource) return;
    const src = ctx.createBufferSource();
    const gain = ctx.createGain();
    const t = ctx.currentTime;
    src.buffer = buf;
    gain.gain.setValueAtTime(vol * 0.8, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    connectAndStartNode(ctx, src, gain, pan, t, 0.12);
  }

  public update(
    camPos: THREE.Vector3,
    camRight: THREE.Vector3,
    entities: { id: string; pos: THREE.Vector3; charm?: number }[],
    nowMs = performance.now(),
    entropy = 0.0,
    cfg = LIDAR_AUDIO_CONFIG,
  ): void {
    if (!this.enabled) return;
    if (nowMs - this.lastPingMs < cfg.pingIntervalMs) return;
    const target = this.findNearestCharmable(camPos, entities, cfg);
    if (!target) return;
    this.lastPingMs = nowMs;
    const effect = evaluateAudioEntropy(entropy);
    if (effect === 'drop') return;
    const pan = calcPan(camPos, camRight, target.pos);
    const { freq, vol } = calcPitchAndVol(target.dist, cfg);
    if (effect === 'noise') {
      this.playNoisePing(pan, vol);
    } else {
      this.playPing(pan, freq, vol);
    }
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
