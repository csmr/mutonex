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
    destination: {},
    getPlayCount: () => playCount,
    getLastFreq: () => lastFreq,
    getLastVol: () => lastVol,
    createOscillator: () => {
      playCount++;
      return osc;
    },
    createGain: () => gain,
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

Deno.test(
  'LidarAudio: plays pings at 5000ms intervals for nearest target',
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
    ];

    audio.update(camPos, camRight, entities, 5000);
    assertEquals(ctx.getPlayCount(), 1);
    assertAlmostEquals(
      ctx.getLastFreq(),
      LIDAR_AUDIO_CONFIG.maxFreqHz,
      0.01,
    );

    // Within 5000ms interval -> no additional ping
    audio.update(camPos, camRight, entities, 6000);
    assertEquals(ctx.getPlayCount(), 1);

    // After 5000ms interval -> triggers second ping
    audio.update(camPos, camRight, entities, 10001);
    assertEquals(ctx.getPlayCount(), 2);
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

  audio.update(camPos, camRight, farEntities, 5000);
  assertEquals(ctx.getPlayCount(), 0);

  audio.enabled = false;
  const nearEntities = [
    {
      id: 'npc_near',
      pos: new MockVector3(5, 0, 0) as any,
      charm: 10,
    },
  ];
  audio.update(camPos, camRight, nearEntities, 5000);
  assertEquals(ctx.getPlayCount(), 0);
});
