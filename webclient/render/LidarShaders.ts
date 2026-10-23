export const LidarVertexShader = `
uniform sampler2D tDepth;
uniform mat4 viewInverse;
uniform float cameraFar;
uniform float scanMode;
uniform float dotRadiusMin;
uniform float dotRadiusMax;
uniform float dotType;
uniform float beamMode;

varying float vRawDepth;
varying float vDist;
varying vec2 vUv;
varying vec3 vWorldPos;

bool isSky(float d) {
  return d > 0.99;
}

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

float beamPointSize() {
  float meters = max(vDist, 3.0);
  float px = dotRadiusMax * 1.5 * 3.0 / meters;
  return max(px, max(dotRadiusMin, 0.5) * 2.0);
}

float pointSize() {
  if (scanMode < 0.5) {
    return beamMode > 0.5
      ? beamPointSize()
      : dotRadiusMax * 1.5;
  }
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
uniform float beamMode;
uniform float beamStep;
uniform float beamWidth;
uniform vec2 resolution;

varying float vRawDepth;
varying float vDist;
varying vec2 vUv;
varying vec3 vWorldPos;

const vec3 NEAR_COLOR = vec3(1.0, 0.77, 0.54);
const vec3 FAR_COLOR  = vec3(0.4, 0.1, 0.0);

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
  return mod(gl_FragCoord.y, 12.0) > 2.0 ? 0.0 : 1.0;
}

vec2 depthGradient(vec2 uv, vec2 texel) {
  vec2 dx = vec2(texel.x * 2.0, 0.0);
  vec2 dy = vec2(0.0, texel.y * 2.0);
  float gx = sampleDepth(uv + dx) - sampleDepth(uv - dx);
  float gy = sampleDepth(uv + dy) - sampleDepth(uv - dy);
  return vec2(gx, gy);
}

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
  pt.x /= 5.0;
  return 1.0 - smoothstep(0.05, 0.5, length(pt));
}

float elevationOf(vec3 w) {
  vec3 rel = w - cameraPosition;
  float d = max(length(rel), 0.001);
  return asin(clamp(rel.y / d, -1.0, 1.0));
}

float beamRowAlpha() {
  float stepVal = max(beamStep, 0.0001);
  float x = elevationOf(vWorldPos) / stepVal;
  float cRad = abs(x - floor(x + 0.5)) * stepVal;
  return 1.0 - smoothstep(beamWidth, beamWidth * 2.0, cRad);
}

float shapeAlpha() {
  if (scanMode < 0.5) {
    if (beamMode < 0.5) return contourAlpha();
    return beamRowAlpha() * circleAlpha();
  }
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
uniform float stripeSpacing;
uniform float stripeWidth;

varying float vViewZ;
varying vec3 vViewPosition;
varying vec3 vNormal;
varying vec2 vLidarTexCoord;
varying vec3 vWorldPosition;

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

void emitProcedural(vec3 base) {
  float d = vViewZ / far;
  if (stripeMask(vLidarTexCoord.x) < 0.5) {
    gl_FragColor = vec4(vec3(0.0), d);
    return;
  }
  gl_FragColor = vec4(hitColor(base), d);
}

void main() {
  vec3 base = mix(uColor, elevationColor(vWorldPosition.y), 0.7);
  if (uProceduralMode < 0.5) {
    emitDepthColor(base);
    return;
  }
  emitProcedural(base);
}
`;

export const OutlineVertexShader = `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

export const OutlineFragmentShader = `
uniform sampler2D tScene;
uniform sampler2D tNormal;
uniform vec2 resolution;
uniform float minWidth;
uniform float maxWidth;
uniform float far;
uniform float shadeMode;
uniform vec3 nearEdgeColor;
uniform vec3 farEdgeColor;
uniform float gapMeters;
uniform float outlineDebug;

varying vec2 vUv;

const float SKY = 0.99;

float depthAt(vec2 uv) {
  return texture2D(tScene, uv).a;
}

bool isSky(float d) {
  return d > SKY;
}

float widthAt(float d) {
  float meters = max(d * far, 0.001);
  return clamp(maxWidth / meters, minWidth, maxWidth);
}

float jumpOf(vec2 uv, float d0, float dn, float w, float dt) {
  bool sky0 = isSky(d0);
  bool skyT = isSky(dt);
  if (sky0 && skyT) return 0.0;
  if (sky0 != skyT) {
    vec2 normUv = sky0 ? uv + (1.0 / resolution) * w : uv;
    vec3 norm = texture2D(tNormal, normUv).rgb * 2.0 - 1.0;
    if (norm.y > 0.80) return 0.0;
    return gapMeters + 1.0;
  }
  if (isSky(dn)) return 0.0;
  float slope = dn - d0;
  float pred = d0 + slope * w;
  return abs(dt - pred) * far;
}

float dirJump(vec2 uv, vec2 e, float w) {
  vec2 texel = e / resolution;
  float d0 = depthAt(uv);
  float dn = depthAt(uv + texel);
  float dt = depthAt(uv + texel * w);
  return jumpOf(uv, d0, dn, w, dt);
}

float edgeMask(vec2 uv) {
  float w = widthAt(depthAt(uv));
  float ex1 = dirJump(uv, vec2( 1.0, 0.0), w);
  float ex2 = dirJump(uv, vec2(-1.0, 0.0), w);
  float ey1 = dirJump(uv, vec2( 0.0, 1.0), w);
  float ey2 = dirJump(uv, vec2( 0.0,-1.0), w);
  float j = max(max(ex1, ex2), max(ey1, ey2));
  return step(gapMeters, j);
}

vec3 computeShade(vec2 uv) {
  if (shadeMode > 0.5) {
    vec3 norm = texture2D(tNormal, uv).rgb * 2.0 - 1.0;
    float t = clamp(norm.z * 0.5 + 0.5, 0.0, 1.0);
    return mix(farEdgeColor, nearEdgeColor, t);
  }
  vec2 texel = 1.0 / resolution;
  float dY = depthAt(uv + vec2(0.0, texel.y)) -
             depthAt(uv - vec2(0.0, texel.y));
  float t = clamp(abs(dY) * 50.0, 0.3, 1.0);
  return mix(farEdgeColor, nearEdgeColor, t);
}

void main() {
  float m = edgeMask(vUv);
  if (outlineDebug > 0.5) {
    gl_FragColor = vec4(vec3(m), 1.0);
    return;
  }
  if (m < 0.01) discard;
  vec3 col = computeShade(vUv);
  gl_FragColor = vec4(col, m);
}
`;

export const NormalMeshVertexShader = `
varying vec3 vWorldNormal;
varying float vViewZ;

void main() {
  vWorldNormal = normalize(mat3(modelMatrix) * normal);
  vec4 vPos = modelViewMatrix * vec4(position, 1.0);
  vViewZ = -vPos.z;
  gl_Position = projectionMatrix * vPos;
}
`;

export const NormalMeshFragmentShader = `
uniform float far;

varying vec3 vWorldNormal;
varying float vViewZ;

void main() {
  vec3 n = normalize(vWorldNormal) * 0.5 + 0.5;
  gl_FragColor = vec4(n, vViewZ / far);
}
`;
