// Declare THREE as a global variable to access it from the <script> tag
declare const THREE: any;

import type { Terrain } from './MockGameStateProvider.ts';

export function createTerrainMesh(terrain: Terrain) {
  const { width, height } = terrain.size;
  const geometry = new THREE.PlaneGeometry(width, height, width - 1, height - 1);

  const vertices = geometry.attributes.position.array as number[];
  for (let i = 0; i < terrain.data.length; i++) {
    for (let j = 0; j < terrain.data[i].length; j++) {
      const index = (i * width + j);
      // The z-coordinate in PlaneGeometry corresponds to the y-axis in world space.
      // We are rotating the plane to be our ground, so we update the 'y' vertex.
      vertices[index * 3 + 1] = terrain.data[i][j];
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
