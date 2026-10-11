// collision_engine_test.ts
//
// Deno tests for CollisionEngine module.
// Run: deno test webclient/tests/collision_engine_test.ts

import {
  assertEquals,
  assertMatch,
} from 'https://deno.land/std@0.224.0/assert/mod.ts';

class MockVector3 {
  constructor(
    public x = 0,
    public y = 0,
    public z = 0,
  ) {}
  clone() {
    return new MockVector3(this.x, this.y, this.z);
  }
  copy(v: MockVector3) {
    this.x = v.x;
    this.y = v.y;
    this.z = v.z;
    return this;
  }
  add(v: MockVector3) {
    this.x += v.x;
    this.y += v.y;
    this.z += v.z;
    return this;
  }
}

(globalThis as any).THREE = { Vector3: MockVector3 };

const {
  getObstacleRadius,
  isColliding2D,
  resolveSlideMovement,
  resolveFaunaStep,
} = await import('../core/CollisionEngine.ts');

Deno.test('CollisionEngine: getObstacleRadius returns expected radii', () => {
  const round = (val: number) => Math.round(val * 100) / 100;
  assertEquals(round(getObstacleRadius('player')), 0.7);
  assertEquals(round(getObstacleRadius('fauna')), 0.6);
  assertEquals(round(getObstacleRadius('mineral')), 0.7);
  assertEquals(round(getObstacleRadius('tent')), 2.45);
  assertEquals(round(getObstacleRadius('cityscape')), 5.25);
});

Deno.test('CollisionEngine: isColliding2D detects overlapping circles', () => {
  const p1 = new MockVector3(0, 0, 0) as any;
  const p2 = new MockVector3(1, 0, 0) as any;
  const p3 = new MockVector3(5, 0, 0) as any;

  assertEquals(isColliding2D(p1, 0.8, p2, 0.8), true);
  assertEquals(isColliding2D(p1, 0.8, p3, 0.8), false);
});

Deno.test('CollisionEngine: resolveSlideMovement slides along obstacle', () => {
  const start = new MockVector3(0, 0, 0) as any;
  const move = new MockVector3(1, 0, 1) as any;
  const obstacle = {
    id: 'tent_1',
    pos: new MockVector3(1.5, 0, 0) as any,
    radius: 1.0,
  };

  const nextPos = resolveSlideMovement(
    start,
    move,
    0.8,
    [obstacle],
  );

  assertEquals(nextPos.x, 0);
  assertEquals(nextPos.z, 1);
});

Deno.test('CollisionEngine: resolveFaunaStep pushes fauna outside obstacle', () => {
  const cand = new MockVector3(1.0, 0, 0) as any;
  const obstacle = {
    id: 'building_1',
    pos: new MockVector3(0, 0, 0) as any,
    radius: 2.0,
  };

  const safe = resolveFaunaStep(cand, 0.8, [obstacle]);

  const dx = safe.x - obstacle.pos.x;
  const dz = safe.z - obstacle.pos.z;
  const dist = Math.sqrt(dx * dx + dz * dz);

  assertEquals(dist >= 2.9, true);
});

Deno.test('CollisionEngine: resolveSlideMovement allows backing away from overlap', () => {
  const start = new MockVector3(1.0, 0, 0) as any;
  const moveAway = new MockVector3(0.5, 0, 0) as any;
  const obstacle = {
    id: 'tent_1',
    pos: new MockVector3(0, 0, 0) as any,
    radius: 1.0,
  };

  const nextPos = resolveSlideMovement(
    start,
    moveAway,
    0.8,
    [obstacle],
  );

  assertEquals(nextPos.x, 1.5);
});
