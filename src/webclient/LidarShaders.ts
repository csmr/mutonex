export const LidarVertexShader = `
    uniform sampler2D tDepth;
    uniform mat4 viewInverse;
    uniform mat4 projectionInverse;
    uniform float cameraNear;
    uniform float cameraFar;
    uniform float scanMode;
    uniform float dotRadiusMin;
    uniform float dotRadiusMax;
    uniform float dotType;

    varying float vRawDepth;
    varying float vDist;
    varying vec2 vUv;
    varying vec3 vWorldPos;

    // MeshDepthMaterial(BasicDepthPacking) writes linear 
    // depth: d = z_view / far.
    // z_view is positive camera-space depth (-Z axis).
    // Reconstruct world position from UV and depth.
    vec3 computeWorldPos(vec2 texCoord, float linearDepth) {
        // Linear camera-space depth (positive, along the view axis).
        float zView = linearDepth * cameraFar;

        // NDC xy from UV.
        vec2 ndc = texCoord * 2.0 - 1.0;

        // Unproject to view space using projection matrix entries.
        // projectionMatrix[0][0] = 2*near / (right-left) = focal length x
        // projectionMatrix[1][1] = 2*near / (top-bottom)  = focal length y
        // For perspective: x_view = ndc.x * z_view / projMatrix[0][0]
        // Note: z_view is positive distance; view-space Z is negative in THREE.
        float xView =  ndc.x * zView / projectionMatrix[0][0];
        float yView =  ndc.y * zView / projectionMatrix[1][1];

        // View-space position (THREE convention: camera looks along -Z).
        vec4 viewPos = vec4(xView, yView, -zView, 1.0);

        // Transform to world space.
        vec4 worldPos = viewInverse * viewPos;
        return worldPos.xyz;
    }

    void main() {
        vUv = uv;
        float d = texture2D(tDepth, uv).a;
        vRawDepth = d;

        // d == 0.0: no geometry (sky). Move off-screen.
        // BasicDepth clears to white (1.0) for far plane,
        // but sky is cleared to white in preRender.
        // So d > 0.99 = background.
        if (d > 0.99) {
            gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
            gl_PointSize = 0.0;
            vDist = 9999.0;
            return;
        }

        vec3 w = computeWorldPos(uv, d);

        // Re-project the reconstructed world position into screen space.
        gl_Position = projectionMatrix * modelViewMatrix * vec4(w, 1.0);
        vWorldPos = w;

        // Linear distance = d * far (already have it).
        vDist = d * cameraFar;

        if (scanMode < 0.5) {
            // Emulated contour rays are distributed evenly in screen-space.
            // Therefore, the screen-space distance between them is CONSTANT regardless of depth!
            // We just provide enough gl_PointSize headroom to draw the elongated dash.
            gl_PointSize = dotRadiusMax * 1.5; 
        } else { // scanMode >= 0.5
            if (dotType > 0.5) {
                // Horizontal (default) scan mode - interpolate dot size based on distance
                float distT = clamp(vDist / 30.0, 0.0, 1.0); 
                float currentRadius = mix(dotRadiusMax, dotRadiusMin, distT);
                gl_PointSize = max(1.0, currentRadius * 2.0);
            } else {
                // Legacy retro pixel block fixed size
                gl_PointSize = dotRadiusMax;
            }
        }
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

    float rand(vec2 co){
        return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
    }

    void main() {
        // Discard points from depth values that look like background.
        if (vRawDepth > 0.95) {
            discard;
        }

        // DIAGNOSTIC MODE: colour-code world Y to verify reconstruction.
        if (diagMode > 1.5) {
            // diagMode = 2.0: raw depth greyscale — proves depth texture read
            gl_FragColor = vec4(vRawDepth, vRawDepth, vRawDepth, 1.0);
            return;
        }
        if (diagMode > 0.5) {
            if (vWorldPos.y > 0.1) {
                gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0); // red: elevated
            } else {
                gl_FragColor = vec4(0.0, 0.0, 1.0, 1.0); // blue: ground
            }
            return;
        }

        float shapeAlpha = 1.0;

        if (scanMode >= 0.5) {
            if (dotType > 0.5) {
                // --- DYNAMIC POINT SPRITE CIRCLES ---
                vec2 pt = gl_PointCoord - vec2(0.5);
                float distFromCenter = length(pt);

                // Anti-Aliasing & Additive Blending
                shapeAlpha = 1.0 - smoothstep(0.1, 0.5, distFromCenter);

                if (shapeAlpha < 0.01) discard;
                
            } else {
                // --- LEGACY SQUARE/PIXEL MODE ---
                if (mod(gl_FragCoord.y, 12.0) > 2.0) discard;
            }
        } else {
            // --- EMULATED SCANNING LIDAR (Contours) ---
            vec2 pt = gl_PointCoord - vec2(0.5);
            
            // 1. Calculate screen-space depth gradient
            vec2 texel = 1.0 / resolution;
            
            // Sample neighboring geometry to determine surface slope
            float dX = texture2D(tDepth, vUv + vec2(texel.x * 2.0, 0.0)).a - texture2D(tDepth, vUv - vec2(texel.x * 2.0, 0.0)).a;
            float dY = texture2D(tDepth, vUv + vec2(0.0, texel.y * 2.0)).a - texture2D(tDepth, vUv - vec2(0.0, texel.y * 2.0)).a;
            
            vec2 grad = vec2(dX, dY);
            float gradLen = length(grad);
            
            // 2. Determine contour flow direction
            vec2 dir = vec2(0.0, 1.0); // default vertical line if flat
            if (gradLen > 0.00001) {
                vec2 gNorm = grad / gradLen;
                dir = vec2(-gNorm.y, gNorm.x);
            }
            
            // 3. 2D Rotation Matrix
            mat2 rot = mat2(
                dir.x, -dir.y,
                dir.y,  dir.x
            );
            
            // 4. Transform point coordinates
            vec2 rotatedPt = rot * pt;
            
            // 5. Elongate into a dash
            rotatedPt.x /= 5.0; 
            
            float dist = length(rotatedPt);
            shapeAlpha = 1.0 - smoothstep(0.05, 0.5, dist);
            
            if (shapeAlpha < 0.01) discard;
        }

        // Entropy-based signal loss
        float noise = rand(vUv * fract(time));
        if (noise < entropy * 0.3) discard;

        // Distance-based brightness
        float baseBrightness = clamp(1.0 - vDist / 30.0, 0.05, 1.0);

        // Elevation-based contrast boost
        float elevationBoost = step(0.1, vWorldPos.y);
        float brightness = mix(baseBrightness, max(baseBrightness, 0.3), elevationBoost);

        // Colour: warm white/orange close, dark deep orange far.
        vec3 nearColor = vec3(1.0, 0.77, 0.54);  // ~3800K
        vec3 farColor  = vec3(0.4, 0.1, 0.0);    // ~1700K
        vec3 color = mix(farColor, nearColor, brightness);

        // Sample intrinsic entity color from .rgb (which now includes terrain elevation coloring)
        vec3 baseObjColor = texture2D(tDepth, vUv).rgb;
        vec3 blendedTint = mix(vec3(1.0), baseObjColor, 0.5);
        color *= blendedTint;

        if (scanMode < 0.5) {
            color *= 0.35;
            shapeAlpha *= 0.8;
        }

        gl_FragColor = vec4(color, brightness * shapeAlpha);
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

        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPos.xyz;

        // Calculate texture coordinates based on the LIDAR scan geometry
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
    uniform float time;
    
    varying float vViewZ;
    varying vec3 vViewPosition;
    varying vec3 vNormal;
    varying vec2 vLidarTexCoord;
    varying vec3 vWorldPosition;

    vec3 getElevationColor(float y) {
        // sea-blue at 0 or below
        if (y <= 0.0) return vec3(0.0, 0.2, 0.5);

        // 0 to 1.0 (800m): dark brown to green to red
        if (y < 0.5) {
            float t = y / 0.5;
            return mix(vec3(0.2, 0.1, 0.0), vec3(0.0, 0.5, 0.0), t);
        }
        if (y < 1.0) {
            float t = (y - 0.5) / 0.5;
            return mix(vec3(0.0, 0.5, 0.0), vec3(0.8, 0.0, 0.0), t);
        }

        // 1.0 to 2.5 (800-2000m): violet to light pale blue
        if (y < 2.5) {
            float t = (y - 1.0) / 1.5;
            return mix(vec3(0.5, 0.0, 0.5), vec3(0.6, 0.8, 1.0), t);
        }

        // 2.5 to 8.0 (2000-8000m): white-blue to white-yellow
        if (y < 8.0) {
            float t = (y - 2.5) / 5.5;
            return mix(vec3(0.8, 0.9, 1.0), vec3(1.0, 1.0, 0.8), t);
        }

        return vec3(1.0, 1.0, 0.9);
    }

    void main() {
        vec3 elevationColor = getElevationColor(vWorldPosition.y);
        // Mix object color with elevation color
        vec3 finalBaseColor = mix(uColor, elevationColor, 0.7);

        if (uProceduralMode < 0.5) {
            // Mode 0: Default Depth+Color render pass for PointCloud Sprites
            gl_FragColor = vec4(finalBaseColor, vViewZ / far);
        } else {
            // Mode 1: Camera-Space Procedural Projection
            float depth = clamp(vViewZ, 1.0, far);
            float yawAngle = vLidarTexCoord.x;
            
            float stripeSpacing = 0.017;
            float stripeWidth = 0.002;
            
            float slice = mod(yawAngle, stripeSpacing);
            float isStripe = step(slice, stripeWidth);

            vec3 viewDirection = normalize(vViewPosition);
            vec3 nNormal = normalize(vNormal);
            float lambert = max(0.0, dot(nNormal, -viewDirection));
            
            float normalizedDepth = clamp(depth / 80.0, 0.0, 1.0);
            
            vec3 nearColor = vec3(1.0, 0.77, 0.54);
            vec3 farColor  = vec3(0.4, 0.1, 0.0);
            
            vec3 paletteColor = mix(nearColor, farColor, normalizedDepth);
            
            // Mix the elevation-aware color into the procedural Lidar palette
            vec3 stripeColor = mix(paletteColor, finalBaseColor, 0.25);
            
            float illumination = lambert * 0.9 + 0.1;
            float distanceFade = 1.0 - normalizedDepth;
            distanceFade = pow(distanceFade, 3.0); 

            if (isStripe < 0.5) {
                gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
            } else {
                vec3 finalHit = stripeColor * illumination * 3.0 * distanceFade;
                gl_FragColor = vec4(finalHit, 1.0);
            }
        }
    }
`;
