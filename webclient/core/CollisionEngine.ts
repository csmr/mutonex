import './global_types.ts';

import {
  getEntityProfile,
  getGlyphsForType,
} from './EntityProfiles.ts';

export interface Obstacle {
  id: string;
  pos: THREE.Vector3;
  radius: number;
}

export function getObstacleRadius(typeOrHex: string): number {
  const prof = getEntityProfile(typeOrHex);
  return (prof?.scale ?? 2.0) * 0.5;
}

export function isColliding2D(
  p1: THREE.Vector3,
  r1: number,
  p2: THREE.Vector3,
  r2: number,
): boolean {
  const dx = p1.x - p2.x;
  const dz = p1.z - p2.z;
  const sum = r1 + r2;
  return (dx * dx + dz * dz) < (sum * sum);
}

function distSq2D(a: THREE.Vector3, b: THREE.Vector3): number {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return dx * dx + dz * dz;
}

export function findCollision(
  pos: THREE.Vector3,
  radius: number,
  obstacles: Obstacle[],
  excludeId?: string,
): Obstacle | null {
  for (const obs of obstacles) {
    if (excludeId && obs.id === excludeId) continue;
    if (isColliding2D(pos, radius, obs.pos, obs.radius)) {
      return obs;
    }
  }
  return null;
}

export function findBlockingCollision(
  candPos: THREE.Vector3,
  curPos: THREE.Vector3,
  radius: number,
  obstacles: Obstacle[],
): Obstacle | null {
  for (const obs of obstacles) {
    if (isColliding2D(candPos, radius, obs.pos, obs.radius)) {
      if (distSq2D(candPos, obs.pos) < distSq2D(curPos, obs.pos)) {
        return obs;
      }
    }
  }
  return null;
}

let scratchX: THREE.Vector3 | null = null;
let scratchZ: THREE.Vector3 | null = null;

function getScratchX(): THREE.Vector3 {
  if (!scratchX) scratchX = new THREE.Vector3();
  return scratchX;
}

function getScratchZ(): THREE.Vector3 {
  if (!scratchZ) scratchZ = new THREE.Vector3();
  return scratchZ;
}

export function resolveSlideMovement(
  currentPos: THREE.Vector3,
  moveVec: THREE.Vector3,
  radius: number,
  obstacles: Obstacle[],
): THREE.Vector3 {
  const sx = getScratchX();
  const sz = getScratchZ();

  sx.copy(currentPos);
  sx.x += moveVec.x;
  const colX = findBlockingCollision(
    sx,
    currentPos,
    radius,
    obstacles,
  );
  const finalX = colX ? currentPos.x : sx.x;

  sz.copy(currentPos);
  sz.x = finalX;
  sz.z += moveVec.z;
  const colZ = findBlockingCollision(
    sz,
    currentPos,
    radius,
    obstacles,
  );
  const finalZ = colZ ? currentPos.z : sz.z;

  return new THREE.Vector3(finalX, currentPos.y, finalZ);
}

export function resolveFaunaStep(
  cand: THREE.Vector3,
  radius: number,
  obstacles: Obstacle[],
  excludeId?: string,
): THREE.Vector3 {
  const hit = findCollision(cand, radius, obstacles, excludeId);
  if (!hit) return cand;

  const res = cand.clone();
  const dx = res.x - hit.pos.x;
  const dz = res.z - hit.pos.z;
  const dist = Math.sqrt(dx * dx + dz * dz) || 0.001;
  const minDist = hit.radius + radius + 0.1;
  const nx = dx / dist;
  const nz = dz / dist;

  res.x = hit.pos.x + nx * minDist;
  res.z = hit.pos.z + nz * minDist;
  return res;
}
