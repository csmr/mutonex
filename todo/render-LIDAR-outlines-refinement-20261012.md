# LIDAR View Outlines Refinement Itinerary

## Goal

Refine LIDAR outline rendering to eliminate internal edge
bleed, constrain terrain outline sweeps, and isolate true outer
geometry silhouettes.

## Refinement Targets

### 1. Upper-Half Terrain & Sector Plane Masking
- Restrict terrain/sector plane edge detection to upper-half.
- Prevent lower horizon & ground plane undersides from false
  outline clutter.

### 2. Edge Bleed Reduction
- Prevent 1–5 px outline strokes from bleeding into adjacent
  inner vertex triangles.
- Normalize edge depth thresholds based on screen-space camera
  distance gradients.

### 3. Outer Silhouette Isolation (Inverted Hull / Backface)
- Isolate outer entity silhouettes while ignoring internal holes
  (e.g., Unifont voxel model eyes/gaps) and grid seams.
- Implement Backface Extrusion / Inverted Hull technique.

## Candidate Solution: Inverted Hull Technique

```glsl
// Outline Vertex Shader
uniform float outlineThickness;
void main() {
  vec3 newPos = position + normal * outlineThickness;
  gl_Position =
    projectionMatrix * modelViewMatrix * vec4(newPos, 1.0);
}
```

```glsl
// Outline Fragment Shader
uniform vec3 outlineColor;
void main() {
  gl_FragColor = vec4(outlineColor, 1.0);
}
```

### Material Configuration
- Set `side = THREE.BackSide` (culls front faces).
- Set `depthTest = true`, `depthWrite = false`.
- Render order: opaque pass first, then backface hull pass.

## Execution Steps

1. Add upper-half screen mask for terrain/sector plane edges.
2. Implement depth-gradient thresholding to reduce inner bleed.
3. Add `InvertedHullMaterial` pass for Unifont 3D voxel models.
4. Verify visual quality in `LidarView` across scan modes.
