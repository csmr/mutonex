// Declare THREE as a global variable to access it from the <script> tag
declare const THREE: any;

import type { Terrain } from "../core/types.ts";

export function createTerrainMesh(
  terrain: Terrain,
  material?: any,
) {
  const { width, height } = terrain.size;
  const geometry = new THREE.PlaneGeometry(
    width,
    height,
    width - 1,
    height - 1,
  );

  const vertices = geometry.attributes.position.array as number[];

  // PlaneGeometry is created in the XY plane.
  // We modify the Z coordinate to represent elevation
  // (which becomes the local up axis relative to the plane).
  // When we rotate the plane -90 degrees around X,
  // the local Z axis becomes the world Y axis (Up),
  // and the local Y axis becomes the world Z axis (Depth).

  let ptr = 2; // Start at the first Z index (0=x, 1=y, 2=z)

  for (const row of terrain.data) {
    for (const z of row) {
      vertices[ptr] = z;
      ptr += 3; // Jump to the next vertex's Z coordinate
    }
  }

  // Rotate the plane to be horizontal (our ground plane)
  geometry.rotateX(-Math.PI / 2);
  geometry.attributes.position.needsUpdate = true;
  geometry.computeVertexNormals(); // Recalculate normals

  const defaultMaterial = new THREE.MeshLambertMaterial({
    color: 0x88aa88,
    wireframe: false,
  });

  const mesh = new THREE.Mesh(geometry, material || defaultMaterial);

  // Store terrain data for height sampling
  mesh.userData.terrainData = terrain.data;
  mesh.userData.terrainSize = terrain.size;

  return mesh;
}

/**
 * Samples the terrain height at a given world X, Z position.
 */
export function sampleTerrainHeight(
  terrainMesh: any,
  worldX: number,
  worldZ: number,
): number {
  if (!terrainMesh || !terrainMesh.userData.terrainData) return 0;

  const data = terrainMesh.userData.terrainData;
  const { width, height } = terrainMesh.userData.terrainSize;

  // Convert world X, Z to grid coordinates
  // Terrain is centered at (0,0)
  const halfW = width / 2;
  const halfH = height / 2;

  const x = worldX + halfW;
  const z = worldZ + halfH;

  // Bilinear interpolation
  const gx = x;
  const gz = z;

  const ix = Math.floor(gx);
  const iz = Math.floor(gz);

  if (ix < 0 || ix >= width - 1 || iz < 0 || iz >= height - 1) return 0;

  const fx = gx - ix;
  const fz = gz - iz;

  const h00 = data[iz][ix];
  const h10 = data[iz][ix + 1];
  const h01 = data[iz + 1][ix];
  const h11 = data[iz + 1][ix + 1];

  const h0 = h00 * (1 - fx) + h10 * fx;
  const h1 = h01 * (1 - fx) + h11 * fx;

  return h0 * (1 - fz) + h1 * fz;
}
