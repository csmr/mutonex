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
        // Red  = elevated object (vWorldPos.y > 0.1)
        // Blue = ground plane   (vWorldPos.y <= 0.1)
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
                // gl_PointCoord gives [0,1] local coordinates for the square sprite.
                vec2 pt = gl_PointCoord - vec2(0.5);
                float distFromCenter = length(pt);

                // Anti-Aliasing & Additive Blending: we smooth the edge 
                // gradually to create a soft, glowing point sprite.
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
                // Vector perpendicular to gradient acts as our surface contour line
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
            // Stretching along X so the dash lies along the contour direction
            rotatedPt.x /= 5.0; 
            
            float dist = length(rotatedPt);
            shapeAlpha = 1.0 - smoothstep(0.05, 0.5, dist);
            
            if (shapeAlpha < 0.01) discard;
        }

        // Entropy-based signal loss: randomly drop a fraction of pixels.
        float noise = rand(vUv * fract(time));
        if (noise < entropy * 0.3) discard;

        // Distance-based brightness.
        // Tuned for typical viewing range: 1 to 30.
        // clamp ensures near objects stay fully bright; 
        // far objects floor at 5%.
        float baseBrightness = clamp(1.0 - vDist / 30.0, 0.05, 1.0);

        // Elevation-based contrast boost:
        // Elevated objects (y > 0.1) get a brightness 
        // floor of 0.3 so they never vanish into the 
        // dark ground, even at range.
        // Ground fades naturally into near-black.
        float elevationBoost = step(0.1, vWorldPos.y); // 1.0 if elevated, 0.0 if ground
        float brightness = mix(baseBrightness, max(baseBrightness, 0.3), elevationBoost);

        // Colour: warm white/orange close (3800K), dark deep orange far (1700K).
        vec3 nearColor = vec3(1.0, 0.77, 0.54);  // ~3800K (#ffc48a)
        vec3 farColor  = vec3(0.4, 0.1, 0.0);    // ~1700K (#661a00)
        vec3 color = mix(farColor, nearColor, brightness);

        if (scanMode < 0.5) {
            // Line-Lidar mode (Emulated Contours): sample intrinsic entity colour from .rgb
            vec3 baseObjColor = texture2D(tDepth, vUv).rgb;
            
            vec3 blendedTint = mix(vec3(1.0), baseObjColor, 0.375);
            color *= blendedTint;

            // Global brightness dampening to prevent white-hot blowout on dense geometry
            // Since we scaled horizontal resolution to 800 and overlap elongated dashes
            // additive blending stacks extremely fast.
            color *= 0.35; // reduced from 0.9
            shapeAlpha *= 0.8; // reduce alpha headroom
        }

        gl_FragColor = vec4(color, brightness * shapeAlpha);
    }
`;
