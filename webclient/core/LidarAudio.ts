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
  pingDurationSec: 0.12,
  minGain: 0.001,
  noiseVolumeFactor: 0.8,
  dropEntropyFactor: 0.35,
  noiseEntropyFactor: 0.70,
  maxTargets: 2,
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

export function calcDelaySec(
  dist: number,
  cfg = LIDAR_AUDIO_CONFIG,
): number {
  const clamped = Math.max(0, Math.min(cfg.maxRange, dist));
  const ratio = clamped / cfg.maxRange;
  return (ratio * cfg.pingIntervalMs) / 1000;
}

export function evaluateAudioEntropy(
  entropy: number,
  roll = Math.random(),
  cfg = LIDAR_AUDIO_CONFIG,
): 'normal' | 'drop' | 'noise' {
  if (entropy <= 0) return 'normal';
  if (roll < entropy * cfg.dropEntropyFactor) return 'drop';
  if (roll < entropy * cfg.noiseEntropyFactor) return 'noise';
  return 'normal';
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
  private noiseBuffer: any = null;

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

  public getNoiseBuffer(
    ctx: any,
    cfg = LIDAR_AUDIO_CONFIG,
  ): any {
    if (this.noiseBuffer) return this.noiseBuffer;
    if (!ctx?.createBuffer) return null;
    const rate = ctx.sampleRate || 44100;
    const len = (rate * cfg.pingDurationSec) | 0;
    const buf = ctx.createBuffer(1, len, rate);
    const data = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < data.length; i++) {
      last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
      data[i] = last * 3.5;
    }
    this.noiseBuffer = buf;
    return this.noiseBuffer;
  }

  private connectAndStart(
    node: any,
    gain: any,
    pan: number,
    t: number,
    dur: number,
  ): void {
    const ctx = this.ctx;
    if (!ctx) return;
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
    if (node.stop) node.stop(t + dur);
  }

  public playPing(
    pan: number,
    freq: number,
    vol: number,
    delaySec = 0,
    cfg = LIDAR_AUDIO_CONFIG,
  ): void {
    if (!this.enabled) return;
    const ctx = this.initCtx();
    if (!ctx) return;
    if (ctx.state === 'suspended' && ctx.resume) ctx.resume();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const t = ctx.currentTime + delaySec;
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(
      cfg.minGain,
      t + cfg.pingDurationSec,
    );
    this.connectAndStart(osc, gain, pan, t, cfg.pingDurationSec);
  }

  public playNoisePing(
    pan: number,
    vol: number,
    delaySec = 0,
    cfg = LIDAR_AUDIO_CONFIG,
  ): void {
    if (!this.enabled) return;
    const ctx = this.initCtx();
    if (!ctx || !ctx.createBufferSource) return;
    if (ctx.state === 'suspended' && ctx.resume) ctx.resume();
    const buf = this.getNoiseBuffer(ctx, cfg);
    if (!buf) return;
    const src = ctx.createBufferSource();
    const gain = ctx.createGain();
    const t = ctx.currentTime + delaySec;
    src.buffer = buf;
    gain.gain.setValueAtTime(vol * cfg.noiseVolumeFactor, t);
    gain.gain.exponentialRampToValueAtTime(
      cfg.minGain,
      t + cfg.pingDurationSec,
    );
    this.connectAndStart(src, gain, pan, t, cfg.pingDurationSec);
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
    const targets = this.findNearestCharmables(
      camPos,
      entities,
      cfg,
    );
    if (targets.length === 0) return;
    this.lastPingMs = nowMs;
    targets.forEach((target) => {
      const effect = evaluateAudioEntropy(entropy, Math.random(), cfg);
      if (effect === 'drop') return;
      const pan = calcPan(camPos, camRight, target.pos);
      const { freq, vol } = calcPitchAndVol(target.dist, cfg);
      const delaySec = calcDelaySec(target.dist, cfg);
      if (effect === 'noise') {
        this.playNoisePing(pan, vol, delaySec, cfg);
      } else {
        this.playPing(pan, freq, vol, delaySec, cfg);
      }
    });
  }

  private findNearestCharmables(
    camPos: THREE.Vector3,
    entities: { id: string; pos: THREE.Vector3; charm?: number }[],
    cfg: typeof LIDAR_AUDIO_CONFIG,
  ) {
    const list: { pos: THREE.Vector3; dist: number }[] = [];
    entities.forEach((e) => {
      if (!e.charm || e.charm <= 0) return;
      const dist = camPos.distanceTo(e.pos);
      if (dist <= cfg.maxRange) list.push({ pos: e.pos, dist });
    });
    list.sort((a, b) => a.dist - b.dist);
    return list.slice(0, cfg.maxTargets || 2);
  }
}
