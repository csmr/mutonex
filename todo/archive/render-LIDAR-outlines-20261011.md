# LIDAR View: Screen-Space Outline Plan

## Goal

Draw 1–5 px outlines along image-space object edges,
mainly for `proceduralLidar`
(`ProceduralMeshFragmentShader`).

## Answer

Yes — WebGL can render a constant-pixel-width edge line.

Standard technique: screen-space silhouette detection
(toon/cel outline pass). Detect discontinuities in a
per-pixel buffer, stamp a line of uniform framebuffer width.

## Why this pipeline fits

The render target already packs the full edge signal:

| Channel | Content                             |
| ------- | ----------------------------------- |
| alpha   | linear depth (`vViewZ / far`)       |
| RGB     | intrinsic base color (elevation-t.) |

No hull inversion, stencil tricks, or geometry duplication.

Consequence: `LidarVertexShader` needs no structural change.
Outlines are per-pixel, not per-point.

## Approach: post-process pass, not per-point sampling

| Option               | Verdict                       |
| -------------------- | ----------------------------- |
| Per-point sampling   | rejected: gappy lines;        |
| in fragment shader   | ignores procedural mode       |
| Fullscreen outline   | chosen: works for both        |
| quad post-compositing| styles                        |

### Edge signal

Primary: depth discontinuity (alpha).
Secondary: color discontinuity (RGB) —
catches seams where depth is continuous.

Thresholds must be depth-normalized,
or distant geometry self-outlines (false halos):

```glsl
float edgeOf(float a, float b) {
  float rel = abs(a - b) / max(max(a, b), 0.001);
  return clamp(rel, 0.0, 1.0);
}
```

Optional: threshold on world-space gap in meters
(`d * cameraFar`) instead of normalized depth.

### Width and sky

- `outlineWidth` uniform (1–5 px), sub-pixel smooth.
  Above 3 px, sample 4–8 neighbors to fill corners.
- Sky clears alpha to 1.0: mask sky-to-sky pairs
  so the sky never self-outlines.

### Compositing

| Property               | Value                         |
| ---------------------- | ----------------------------- |
| blending               | `THREE.NormalBlending`        |
| depthTest / depthWrite | false / false                 |
| output                 | `vec4(outlineColor, edgeMask)`|

Draw outlines first, or reduce alpha (`edgeMask * 0.8`),
so lidar dots stay visible.

## Integration

1. Import new outline shaders in `webclient/view/LidarView.ts`.
2. UI cycles through shader modes with keypress controls.
3. Webclient outputs current shader name to console
   whenever View mode is changed.
4. Add `OutlineMaterial` + fullscreen quad to `this.scene`.
5. Uniforms: `tScene`, `resolution`, `outlineWidth`,
   `outlineColor`, `depthThreshold`, `colorThreshold`.
6. Remove the `preRender` fast-path bypass for
   `proceduralLidar` — render into the target so the
   outline pass has a depth source.
7. Add per-style outline config (data-driven):

```ts
// LidarStyles.ts entry
outline: {
  width: 2.5,
  color: '#000000',
  depthThreshold: 0.04,
},
```

8. Share the `resolution` uniform with the outline quad.
9. Add `outlineDebug` uniform: render `edgeMask`
   white-on-black to tune `depthThreshold`.

## `LidarVertexShader`: decoupled fixes

- Legacy square band `mod(gl_FragCoord.y, 12.0) > 2.0`
  is hard-wired: promote to uniform.
- Contour `gl_PointSize` is resolution-independent:
  scale by `resolution.y / 1080.0`.
- Optional: distance-tinted outline width
  (5 px near, 1 px far) once the base pass exists.

## Risks

| Risk                        | Note                             |
| --------------------------- | -------------------------------- |
| Additive points vs outline  | verify, or stamp outlines first  |
| Terrain horizon outlines    | likely desirable                 |
| Performance                 | extra pass: 4-8 fetches/px       |

## Phases

| Phase | Deliverable                                 |
| ----- | ------------------------------------------- |
| 1     | Outline pass for point-cloud depth edges    |
| 2     | Color-discontinuity edges, per-style config |
| 3     | Procedural mode via render target           |
| 4     | Distance-tinted width, debug mode           |

## Refactored source

Here is the example outline implementation,
implemented for the LidarVertexShader and
ProceduralMeshFragmentShader.

```ts
// LidarShaders.ts
// Refactored to AGENTS.md style:
// one-thing functions, blocks < 11 lines,
// lines < 68 chars, data-driven palettes
// instead of imperative chains.

export const LidarVertexShader = `
uniform sampler2D tDepth;
uniform mat4 viewInverse;
uniform float cameraFar;
uniform float scanMode;
uniform float dotRadiusMin;
uniform float dotRadiusMax;
uniform float dotType;

varying float vRawDepth;
varying float vDist;
varying vec2 vUv;
varying vec3 vWorldPos;

bool isSky(float d) {
  return d > 0.99;
}

// BasicDepthPacking: d = z_view / far, linear, positive.
vec3 worldPos(vec2 tc, float d) {
  float zView = d * cameraFar;
  vec2 ndc = tc * 2.0 - 1.0;
  vec4 p = vec4(
    ndc.x * zView / projectionMatrix[0][0],
    ndc.y * zView / projectionMatrix[1][1],
    -zView,
    1.0
  );
  return (viewInverse * p).xyz;
}

vec4 project(vec3 w) {
  return projectionMatrix * modelViewMatrix * vec4(w, 1.0);
}

// Screen-space-constant contour dashes need size headroom.
float pointSize() {
  if (scanMode < 0.5) return dotRadiusMax * 1.5;
  if (dotType < 0.5) return dotRadiusMax;
  float t = clamp(vDist / 30.0, 0.0, 1.0);
  return max(1.0, mix(dotRadiusMax, dotRadiusMin, t) * 2.0);
}

void emit(vec3 w) {
  vWorldPos = w;
  gl_Position = project(w);
  gl_PointSize = pointSize();
}

void main() {
  vUv = uv;
  float d = texture2D(tDepth, uv).a;
  vRawDepth = d;
  vDist = d * cameraFar;
  if (isSky(d)) {
    gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
    gl_PointSize = 0.0;
    return;
  }
  emit(worldPos(uv, d));
}
`;

export const LidarFragmentShader = `
uniform sampler2D tDepth;
uniform float scanMode;
uniform float entropy;
uniform float time;
uniform float diagMode;
uniform float dotType;
uniform vec2 resolution;

varying float vRawDepth;
varying float vDist;
varying vec2 vUv;
varying vec3 vWorldPos;

// Data-driven palette.
const vec3 NEAR_COLOR = vec3(1.0, 0.77, 0.54); // ~3800K
const vec3 FAR_COLOR  = vec3(0.4, 0.1, 0.0);   // ~1700K

float rand(vec2 co) {
  return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
}

float sampleDepth(vec2 uv) {
  return texture2D(tDepth, uv).a;
}

float circleAlpha() {
  vec2 pt = gl_PointCoord - vec2(0.5);
  return 1.0 - smoothstep(0.1, 0.5, length(pt));
}

float squareAlpha() {
  // Legacy band; promote 12.0 to a uniform if reused.
  return mod(gl_FragCoord.y, 12.0) > 2.0 ? 0.0 : 1.0;
}

vec2 depthGradient(vec2 uv, vec2 texel) {
  vec2 dx = vec2(texel.x * 2.0, 0.0);
  vec2 dy = vec2(0.0, texel.y * 2.0);
  float gx = sampleDepth(uv + dx) - sampleDepth(uv - dx);
  float gy = sampleDepth(uv + dy) - sampleDepth(uv - dy);
  return vec2(gx, gy);
}

// Contour flow: perpendicular to the depth gradient.
vec2 flowDir(vec2 grad) {
  if (length(grad) < 0.00001) return vec2(0.0, 1.0);
  vec2 g = normalize(grad);
  return vec2(-g.y, g.x);
}

float contourAlpha() {
  vec2 texel = 1.0 / resolution;
  vec2 dir = flowDir(depthGradient(vUv, texel));
  mat2 rot = mat2(dir.x, -dir.y, dir.y, dir.x);
  vec2 pt = rot * (gl_PointCoord - vec2(0.5));
  pt.x /= 5.0; // elongate into a dash
  return 1.0 - smoothstep(0.05, 0.5, length(pt));
}

float shapeAlpha() {
  if (scanMode < 0.5) return contourAlpha();
  if (dotType < 0.5) return squareAlpha();
  return circleAlpha();
}

bool entropyDrop() {
  float n = rand(vUv * fract(time));
  return n < entropy * 0.3;
}

float brightness() {
  float base = clamp(1.0 - vDist / 30.0, 0.05, 1.0);
  float boost = step(0.1, vWorldPos.y);
  return mix(base, max(base, 0.3), boost);
}

vec3 tDepthLook(vec2 uv) {
  return texture2D(tDepth, uv).rgb;
}

vec3 dotColor(float b) {
  vec3 c = mix(FAR_COLOR, NEAR_COLOR, b);
  vec3 tint = mix(vec3(1.0), tDepthLook(vUv), 0.5);
  return c * tint;
}

void emitDiagnostic() {
  if (diagMode > 1.5) {
    gl_FragColor = vec4(vec3(vRawDepth), 1.0);
    return;
  }
  bool elevated = vWorldPos.y > 0.1;
  gl_FragColor = elevated
    ? vec4(1.0, 0.0, 0.0, 1.0)
    : vec4(0.0, 0.0, 1.0, 1.0);
}

void main() {
  if (vRawDepth > 0.95) discard;
  if (diagMode > 0.5) {
    emitDiagnostic();
    return;
  }
  float alpha = shapeAlpha();
  if (alpha < 0.01 || entropyDrop()) discard;
  float b = brightness();
  vec3 color = dotColor(b);
  if (scanMode < 0.5) {
    color *= 0.35;
    alpha *= 0.8;
  }
  gl_FragColor = vec4(color, b * alpha);
}
`;

export const ProceduralMeshVertexShader = `
varying float vViewZ;
varying vec3 vViewPosition;
varying vec3 vNormal;
varying vec2 vLidarTexCoord;
varying vec3 vWorldPosition;

void main() {
  vec4 vPos = modelViewMatrix * vec4(position, 1.0);
  vViewZ = -vPos.z;
  vViewPosition = vPos.xyz;
  vNormal = normalize(normalMatrix * normal);
  vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
  vLidarTexCoord = vec2(
    atan(vViewPosition.x, -vViewPosition.z),
    vViewPosition.z
  );
  gl_Position = projectionMatrix * vPos;
}
`;

export const ProceduralMeshFragmentShader = `
uniform float far;
uniform vec3 uColor;
uniform float uProceduralMode;
uniform float stripeSpacing; // default 0.017
uniform float stripeWidth;   // default 0.002

varying float vViewZ;
varying vec3 vViewPosition;
varying vec3 vNormal;
varying vec2 vLidarTexCoord;
varying vec3 vWorldPosition;

// Data-driven elevation palette: named stops.
const vec3 SEA         = vec3(0.0, 0.2, 0.5);
const vec3 SOIL        = vec3(0.2, 0.1, 0.0);
const vec3 GRASS       = vec3(0.0, 0.5, 0.0);
const vec3 ROCK        = vec3(0.8, 0.0, 0.0);
const vec3 VIOLET      = vec3(0.5, 0.0, 0.5);
const vec3 PALE_BLUE   = vec3(0.6, 0.8, 1.0);
const vec3 WHITE_BLUE  = vec3(0.8, 0.9, 1.0);
const vec3 WHITE_GOLD  = vec3(1.0, 1.0, 0.8);
const vec3 SNOW        = vec3(1.0, 1.0, 0.9);
const vec3 NEAR_COLOR  = vec3(1.0, 0.77, 0.54);
const vec3 FAR_COLOR   = vec3(0.4, 0.1, 0.0);

vec3 mixAt(vec3 a, vec3 b, float y, float lo, float hi) {
  float t = clamp((y - lo) / (hi - lo), 0.0, 1.0);
  return mix(a, b, t);
}

vec3 elevationColor(float y) {
  if (y <= 0.0) return SEA;
  if (y < 0.5) return mixAt(SOIL, GRASS, y, 0.0, 0.5);
  if (y < 1.0) return mixAt(GRASS, ROCK, y, 0.5, 1.0);
  if (y < 2.5) return mixAt(VIOLET, PALE_BLUE, y, 1.0, 2.5);
  if (y < 8.0) return mixAt(WHITE_BLUE, WHITE_GOLD, y, 2.5, 8.0);
  return SNOW;
}

float stripeMask(float yaw) {
  return step(mod(yaw, stripeSpacing), stripeWidth);
}

float lambert() {
  vec3 view = normalize(vViewPosition);
  return max(0.0, dot(normalize(vNormal), -view));
}

vec3 hitColor(vec3 base) {
  float depth = clamp(vViewZ, 1.0, far);
  float t = clamp(depth / 80.0, 0.0, 1.0);
  vec3 c = mix(NEAR_COLOR, FAR_COLOR, t);
  c = mix(c, base, 0.25);
  float glow = lambert() * 0.9 + 0.1;
  return c * glow * 3.0 * pow(1.0 - t, 3.0);
}

void emitDepthColor(vec3 base) {
  gl_FragColor = vec4(base, vViewZ / far);
}

void main() {
  vec3 base = mix(uColor, elevationColor(vWorldPosition.y), 0.7);
  if (uProceduralMode < 0.5) {
    emitDepthColor(base);
    return;
  }
  if (stripeMask(vLidarTexCoord.x) < 0.5) {
    gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
    return;
  }
  gl_FragColor = vec4(hitColor(base), 1.0);
}
`;

// NEW: fullscreen outline pass (see plan, Phase 1).
// Quad geometry must cover clip space
// (e.g. PlaneGeometry(2, 2)), camera-independent.

export const OutlineVertexShader = `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

export const OutlineFragmentShader = `
uniform sampler2D tScene;
uniform vec2 resolution;
uniform float outlineWidth; // 1..5 px
uniform vec3 outlineColor;
uniform float depthThreshold;
uniform float outlineDebug;

varying vec2 vUv;

const float SKY = 0.99;

float depthAt(vec2 uv) {
  return texture2D(tScene, uv).a;
}

bool skyPair(float a, float b) {
  return a > SKY && b > SKY;
}

// Relative depth edge: avoids false far-plane halos.
float edgeOf(float a, float b) {
  if (skyPair(a, b)) return 0.0;
  float rel = abs(a - b) / max(max(a, b), 0.001);
  return clamp(rel, 0.0, 1.0);
}

float edgeMask(vec2 uv) {
  vec2 t = outlineWidth / resolution;
  float d0 = depthAt(uv);
  float d1 = depthAt(uv + vec2(t.x, 0.0));
  float d2 = depthAt(uv + vec2(0.0, t.y));
  float e = edgeOf(d0, d1) + edgeOf(d1, d2)
          + edgeOf(d2, d0);
  return step(depthThreshold, e);
}

void main() {
  float m = edgeMask(vUv);
  if (outlineDebug > 0.5) {
    gl_FragColor = vec4(vec3(m), 1.0);
    return;
  }
  gl_FragColor = vec4(outlineColor, m);
}
`;

## Refined Shader Logic

### Distance-Scaled Outline Width

The outline shader scales width with distance:

```glsl
float widthAt(float d) {
  float meters = max(d * far, 0.001);
  return clamp(maxWidth / meters, minWidth, maxWidth);
}
```

#### How it works

Each fragment reads depth from alpha (`d * far`), deriving
sampling offset `t = widthAt(d0) / resolution`. Near objects
sample up to 15 texels out; at 15 m it decays to 1 px. `minWidth`
and `maxWidth` are uniforms from `LidarStyles.ts`.

#### Key mechanics

- `outlineWidth` replaced by `far` + `maxWidth` + `minWidth`.
- `edgeMask` uses cross + diagonal taps (`d0`↔`dx`, `d0`↔`dy`,
  `d0`↔`dd`) centered on fragment.
- Cost: 4 texture taps per pixel.

### Shading Modes (`shadeMode` uniform)

| Mode | Signal | Cost |
| --- | --- | --- |
| 0 — screen-space | depth-gradient direction | free |
| 1 — world normal | surface normal Z component | 1 tap/px |

#### Shading Mode Details

- Mode 0 (screen-space): Depth gradient points outward toward
  background, distinguishing upper/lower edges in screen space.
- Mode 1 (world normal): `NormalMeshVertexShader` and
  `NormalMeshFragmentShader` pack world normals (`*0.5+0.5`)
  into RGB buffer.
- `outlineColor` split into `nearEdgeColor` (medium-dark orange)
  and `farEdgeColor` (black).

### Shader Accounting Summary

#### Changed — behavior added or modified

| Shader | What changed |
| --- | --- |
| `OutlineVertexShader` | Fullscreen quad clip passthrough |
| `OutlineFragmentShader` | Edge detection, distance width |
| `NormalMeshVertexShader` | World normals to buffer |
| `NormalMeshFragmentShader` | Packs normal and depth |

#### Changed — refactor only

| Shader | What changed |
| --- | --- |
| `LidarVertexShader` | Restructured into helpers |
| `LidarFragmentShader` | Helpers and palette constants |
| `ProceduralMeshFragmentShader` | Data-driven elevation palette |
| `ProceduralMeshVertexShader` | Cosmetic reformat only |

#### Not changed

- `LidarVertexShader`
- `LidarFragmentShader`
- `ProceduralMeshVertexShader`
- `ProceduralMeshFragmentShader`
