export const LidarVertexShader = `
    uniform sampler2D tDepth;
    uniform mat4 viewInverse;
    uniform mat4 projectionInverse;
    uniform float cameraNear;
    uniform float cameraFar;
    uniform float scanMode;
    uniform float dotRadius;

    varying float vRawDepth;
    varying float vDist;
    varying vec2 vUv;
    varying vec3 vWorldPos;

    // MeshDepthMaterial(BasicDepthPacking) writes linear depth: d = z_view / far.
    // z_view is the positive camera-space depth (distance along -Z axis).
    // Reconstruct world position from screen UV and linear depth.
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
        float d = texture2D(tDepth, uv).r;
        vRawDepth = d;

        // d == 0.0: no geometry (sky / clear). Move off-screen, zero size.
        // BasicDepthPacking clears to white (1.0) for far plane but actually
        // sky pixels are cleared to white in preRender (setClearColor 0xffffff).
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

        if (scanMode >= 0.5) {
            // Horizontal (default) scan mode - parametrizable point size
            gl_PointSize = max(1.0, dotRadius * 2.0);
        } else {
            // High-res (vertical) scan mode - fixed pixel size
            gl_PointSize = 2.0;
        }
    }
`;

export const LidarFragmentShader = `
    uniform float scanMode;
    uniform float entropy;
    uniform float time;
    uniform float diagMode;
    uniform float dotType;

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

        // Horizontal scanline mode (scanMode = 1.0, >= 0.5):
        // Discard fragments outside narrow horizontal bands to produce
        // the scan-line LIDAR aesthetic without any geometry-level line drawing.
        // Band period: 12px, band width: 2px => ~1089/12 = 90 visible scan lines.
        if (scanMode >= 0.5) {
            // 1. Scanline discard
            if (mod(gl_FragCoord.y, 12.0) > 2.0) discard;
            
            // 2. Circular dot mask
            if (dotType > 0.5) {
                vec2 pt = gl_PointCoord - vec2(0.5);
                if (dot(pt, pt) > 0.25) discard;
            }
        }

        // Entropy-based signal loss: randomly drop a fraction of pixels.
        float noise = rand(vUv * fract(time));
        if (noise < entropy * 0.3) discard;

        // Distance-based brightness.
        // Tuned for typical viewing range: 1 (very near) to 30 (far ground edge).
        // clamp ensures near objects stay fully bright; far objects floor at 5%.
        float baseBrightness = clamp(1.0 - vDist / 30.0, 0.05, 1.0);

        // Elevation-based contrast boost:
        // Elevated objects (y > 0.1) get a brightness floor of 0.3 so they
        // never vanish into the dark ground, even at range.
        // Ground (y <= 0.1) fades naturally into near-black ambient.
        float elevationBoost = step(0.1, vWorldPos.y); // 1.0 if elevated, 0.0 if ground
        float brightness = mix(baseBrightness, max(baseBrightness, 0.3), elevationBoost);

        // Colour: bright pure green close, dark grey-green far.
        vec3 nearColor = vec3(0.0, 1.0, 0.05);   // #00ff0d
        vec3 farColor  = vec3(0.05, 0.15, 0.05); // #0d260d
        vec3 color = mix(farColor, nearColor, brightness);

        gl_FragColor = vec4(color, brightness);
    }
`;
