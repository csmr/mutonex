// webclient/tests/lidar_audio_test.ts
import {
  assertEquals,
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

const { calcPan, LidarAudio } = await import(
  '../core/LidarAudio.ts'
);

function createMockAudioCtx() {
  const panner = {
    pan: { setValueAtTime: () => {} },
    connect: () => {},
  };
  const osc = {
    type: 'sine',
    frequency: {
      setValueAtTime: () => {},
      exponentialRampToValueAtTime: () => {},
    },
    connect: () => {},
    start: () => {},
    stop: () => {},
  };
  const gain = {
    gain: {
      setValueAtTime: () => {},
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
  'LidarAudio: updates and plays pings for charmable units',
  () => {
    const ctx = createMockAudioCtx();
    const audio = new LidarAudio(ctx as any);
    const camPos = new MockVector3(0, 0, 0) as any;
    const camRight = new MockVector3(1, 0, 0) as any;

    const entities = [
      {
        id: 'npc_1',
        pos: new MockVector3(5, 0, 0) as any,
        charm: 10,
      },
      {
        id: 'item_1',
        pos: new MockVector3(2, 0, 0) as any,
        charm: 0,
      },
    ];

    audio.update(camPos, camRight, entities, 1000);
    assertEquals(ctx.getPlayCount(), 1);

    // Subsequent update within cooldown should not trigger ping
    audio.update(camPos, camRight, entities, 1200);
    assertEquals(ctx.getPlayCount(), 1);

    // Update after cooldown triggers ping
    audio.update(camPos, camRight, entities, 2000);
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

  audio.update(camPos, camRight, farEntities, 1000);
  assertEquals(ctx.getPlayCount(), 0);

  audio.enabled = false;
  const nearEntities = [
    {
      id: 'npc_near',
      pos: new MockVector3(5, 0, 0) as any,
      charm: 10,
    },
  ];
  audio.update(camPos, camRight, nearEntities, 1000);
  assertEquals(ctx.getPlayCount(), 0);
});
