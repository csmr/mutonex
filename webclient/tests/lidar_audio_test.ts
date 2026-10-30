// webclient/tests/lidar_audio_test.ts
import {
  assertEquals,
  assertAlmostEquals,
} from 'https://deno.land/std@0.224.0/assert/mod.ts';

class MockVector3 {
  constructor(
    public x = 0,
    public y = 0,
    public z = 0,
  ) {}
  distanceTo(v: MockVector3): number {
    const dx = this.x - v.x;
    const dy = this.y - v.y;
    const dz = this.z - v.z;
    return Math.hypot(dx, dy, dz);
  }
}

(globalThis as any).THREE = { Vector3: MockVector3 };

const {
  calcPan,
  calcPitchAndVol,
  evaluateAudioEntropy,
  createNoiseBuffer,
  LidarAudio,
  LIDAR_AUDIO_CONFIG,
} = await import('../core/LidarAudio.ts');

function createMockAudioCtx() {
  const panner = {
    pan: { setValueAtTime: () => {} },
    connect: () => {},
  };
  let lastFreq = 0;
  let lastVol = 0;
  let isNoisePlayed = false;
  const osc = {
    type: 'sine',
    frequency: {
      setValueAtTime: (f: number) => {
        lastFreq = f;
      },
      exponentialRampToValueAtTime: () => {},
    },
    connect: () => {},
    start: () => {},
    stop: () => {},
  };
  const src = {
    buffer: null,
    connect: () => {},
    start: () => {},
    stop: () => {},
  };
  const gain = {
    gain: {
      setValueAtTime: (v: number) => {
        lastVol = v;
      },
      exponentialRampToValueAtTime: () => {},
    },
    connect: () => {},
  };
  let playCount = 0;

  const ctx = {
    state: 'running',
    currentTime: 0,
    sampleRate: 44100,
    destination: {},
    getPlayCount: () => playCount,
    getLastFreq: () => lastFreq,
    getLastVol: () => lastVol,
    getIsNoisePlayed: () => isNoisePlayed,
    createOscillator: () => {
      playCount++;
      return osc;
    },
    createGain: () => gain,
    createBuffer: (_ch: number, len: number, _rate: number) => {
      return { getChannelData: () => new Float32Array(len) };
    },
    createBufferSource: () => {
      playCount++;
      isNoisePlayed = true;
      return src;
    },
    createStereoPanner: () => panner,
  };
  return ctx;
}

Deno.test('calcPan: calculates spatial panning correctly', () => {
  const camPos = new MockVector3(0, 0, 0) as any;
  const camRight = new MockVector3(1, 0, 0) as any;

  const rightPan = calcPan(
    camPos,
    camRight,
    new MockVector3(10, 0, 0) as any,
  );
  assertEquals(rightPan, 1.0);

  const leftPan = calcPan(
    camPos,
    camRight,
    new MockVector3(-10, 0, 0) as any,
  );
  assertEquals(leftPan, -1.0);

  const frontPan = calcPan(
    camPos,
    camRight,
    new MockVector3(0, 0, -10) as any,
  );
  assertEquals(frontPan, 0.0);
});

Deno.test(
  'calcPitchAndVol: maps distance linearly to pitch and volume',
  () => {
    const near = calcPitchAndVol(1.0);
    assertAlmostEquals(near.freq, LIDAR_AUDIO_CONFIG.maxFreqHz, 0.01);
    assertAlmostEquals(
      near.vol,
      LIDAR_AUDIO_CONFIG.maxVolume,
      0.001,
    );

    const far = calcPitchAndVol(30.0);
    assertAlmostEquals(far.freq, LIDAR_AUDIO_CONFIG.minFreqHz, 0.01);
    assertAlmostEquals(far.vol, LIDAR_AUDIO_CONFIG.minVolume, 0.001);

    const mid = calcPitchAndVol(15.5);
    const expectedFreq = (783.99 + 987.77) / 2;
    assertAlmostEquals(mid.freq, expectedFreq, 1.0);
  },
);

Deno.test('evaluateAudioEntropy: drops or mutates signal', () => {
  assertEquals(evaluateAudioEntropy(0, 0.1), 'normal');
  assertEquals(evaluateAudioEntropy(1.0, 0.1), 'drop');
  assertEquals(evaluateAudioEntropy(1.0, 0.5), 'noise');
  assertEquals(evaluateAudioEntropy(1.0, 0.9), 'normal');
});

Deno.test('createNoiseBuffer: creates float32 audio buffer', () => {
  const ctx = createMockAudioCtx();
  const buf = createNoiseBuffer(ctx, 0.1);
  assertEquals(buf !== null, true);
});

Deno.test(
  'LidarAudio: plays pings for up to maxTargets nearest targets',
  () => {
    const ctx = createMockAudioCtx();
    const audio = new LidarAudio(ctx as any);
    const camPos = new MockVector3(0, 0, 0) as any;
    const camRight = new MockVector3(1, 0, 0) as any;

    const entities = [
      {
        id: 'npc_far',
        pos: new MockVector3(20, 0, 0) as any,
        charm: 10,
      },
      {
        id: 'npc_near',
        pos: new MockVector3(1, 0, 0) as any,
        charm: 10,
      },
      {
        id: 'item_1',
        pos: new MockVector3(2, 0, 0) as any,
        charm: 0,
      },
    ];

    audio.update(camPos, camRight, entities, 5000, 0.0);
    assertEquals(ctx.getPlayCount(), 2);

    // Within 5000ms interval -> no additional ping
    audio.update(camPos, camRight, entities, 6000, 0.0);
    assertEquals(ctx.getPlayCount(), 2);

    // After 5000ms interval -> triggers 2 more pings (total 4)
    audio.update(camPos, camRight, entities, 10001, 0.0);
    assertEquals(ctx.getPlayCount(), 4);
  },
);

Deno.test('LidarAudio: respects maxRange and enabled state', () => {
  const ctx = createMockAudioCtx();
  const audio = new LidarAudio(ctx as any);
  const camPos = new MockVector3(0, 0, 0) as any;
  const camRight = new MockVector3(1, 0, 0) as any;

  const farEntities = [
    {
      id: 'npc_far',
      pos: new MockVector3(50, 0, 0) as any,
      charm: 10,
    },
  ];

  audio.update(camPos, camRight, farEntities, 5000, 0.0);
  assertEquals(ctx.getPlayCount(), 0);

  audio.enabled = false;
  const nearEntities = [
    {
      id: 'npc_near',
      pos: new MockVector3(5, 0, 0) as any,
      charm: 10,
    },
  ];
  audio.update(camPos, camRight, nearEntities, 5000, 0.0);
  assertEquals(ctx.getPlayCount(), 0);
});
