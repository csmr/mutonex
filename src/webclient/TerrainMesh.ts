// Declare THREE as a global variable to access it from the <script> tag
declare const THREE: any;

import type { Terrain } from './MockGameStateProvider.ts';

export function createTerrainMesh(terrain: Terrain) {
  const { width, height } = terrain.size;
  const geometry = new THREE.PlaneGeometry(width, height, width - 1, height - 1);

  const vertices = geometry.attributes.position.array as number[];

  // PlaneGeometry is created in the XY plane.
  // We modify the Z coordinate to represent elevation (which becomes the local up axis relative to the plane).
  // When we rotate the plane -90 degrees around X, the local Z axis becomes the world Y axis (Up),
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
  geometry.computeVertexNormals(); // Recalculate normals for correct lighting

  const material = new THREE.MeshLambertMaterial({ color: 0x88aa88, wireframe: false });
  const mesh = new THREE.Mesh(geometry, material);

  return mesh;
}
