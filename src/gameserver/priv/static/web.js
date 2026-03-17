(() => {
  // webclient/GameStateProvider.ts
  var GameStateProvider = class {
    socket;
    channel;
    onInitialState;
    onStateUpdate;
    sectorId;
    phase = "lobby";
    playerId = null;
    constructor(sectorId, onInitialState, onStateUpdate) {
      this.sectorId = sectorId;
      this.onInitialState = onInitialState;
      this.onStateUpdate = onStateUpdate;
      const loc = window.location;
      const isHttps = loc.protocol === "https:";
      const protocol = isHttps ? "wss:" : "ws:";
      const host = loc.host || "localhost:4000";
      const url = `${protocol}//${host}/socket`;
      const Phoenix = window.Phoenix;
      this.socket = new Phoenix.Socket(url);
    }
    start() {
      this.socket.connect();
      this.channel = this.socket.channel(this.sectorId, {});
      this.channel.join().receive("ok", () => {
        console.log("Joined channel successfully");
      }).receive("error", (resp) => {
        console.log("Unable to join channel", resp);
      });
      this.channel.on("game_phase", (payload) => {
        console.log("Game Phase:", payload.phase);
        this.phase = payload.phase;
        if (payload.user_id) this.playerId = payload.user_id;
      });
      this.channel.on("game_state", (payload) => {
        console.log("Received initial game state:", payload);
        this.onInitialState(payload);
      });
      this.channel.on("state_update", (payload) => {
        this.onStateUpdate(payload);
      });
      this.channel.on("fauna_update", (payload) => {
        this.onStateUpdate(payload);
      });
    }
    stop() {
      if (this.channel) this.channel.leave();
      if (this.socket) this.socket.disconnect();
    }
    sendAvatarPosition(position) {
      this.channel.push("avatar_update", position);
    }
    sendPlayerAction(actionType, targetId) {
      this.channel.push("player_action", { action: actionType, target_id: targetId });
    }
  };

  // webclient/ViewManager.ts
  var ViewManager = class {
    renderer;
    // THREE.WebGLRenderer
    activeView = null;
    clock = new THREE.Clock();
    constructor(canvas) {
      this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.renderer.setPixelRatio(window.devicePixelRatio);
      window.addEventListener("resize", this.onWindowResize.bind(this));
    }
    setActiveView(view) {
      if (this.activeView) {
        this.activeView.onDeactivate();
      }
      this.activeView = view;
      this.activeView.onActivate();
    }
    getActiveView() {
      return this.activeView;
    }
    animate() {
      requestAnimationFrame(this.animate.bind(this));
      if (this.activeView) {
        const deltaTime = this.clock.getDelta();
        this.activeView.update(deltaTime);
        if (this.activeView.preRender) {
          this.activeView.preRender(this.renderer);
        }
        this.renderer.render(this.activeView.scene, this.activeView.camera);
      }
    }
    onWindowResize() {
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
  };

  // webclient/FirstPersonControls.ts
  var FirstPersonControls = class {
    camera;
    domElement;
    enabled = false;
    // Disabled by default
    lookSpeed = 2e-3;
    yaw = 0;
    pitch = 0;
    isMouseDown = false;
    onDown = () => this.isMouseDown = true;
    onUp = () => this.isMouseDown = false;
    onMove = (e) => this.handleMove(e);
    constructor(camera, domElement) {
      this.camera = camera;
      this.domElement = domElement;
      this.domElement.addEventListener("mousedown", this.onDown);
      window.addEventListener("mouseup", this.onUp);
      window.addEventListener("mousemove", this.onMove);
      this.yaw = this.camera.rotation.y;
      this.pitch = this.camera.rotation.x;
    }
    handleMove(e) {
      if (!this.enabled || !this.isMouseDown) return;
      this.yaw -= e.movementX * this.lookSpeed;
      this.pitch -= e.movementY * this.lookSpeed;
      const limit = Math.PI / 2 - 0.05;
      this.pitch = Math.max(-limit, Math.min(limit, this.pitch));
      this.camera.rotation.order = "YXZ";
      this.camera.rotation.y = this.yaw;
      this.camera.rotation.x = this.pitch;
    }
    update() {
    }
    dispose() {
      this.domElement.removeEventListener(
        "mousedown",
        this.onDown
      );
      window.removeEventListener("mouseup", this.onUp);
      window.removeEventListener("mousemove", this.onMove);
    }
  };

  // webclient/EntityRenderer.ts
  var EntityRenderer = class {
    scene;
    meshes = /* @__PURE__ */ new Map();
    geoCache = /* @__PURE__ */ new Map();
    loader;
    matFactory;
    charMap = {
      "player": ["\u{1F9D9}", "\u{101D1}", "\u{101D2}", "\u{1F477}", "\u{1F9D5}"],
      "fauna": ["\u{1F400}", "\u{1F402}", "\u{1F406}", "\u{1F408}", "\u{1F40A}", "\u{1F426}", "\u{1F41C}", "\u{1F41D}", "\u{1F997}", "\u{1F422}", "\u{1F415}", "\u{1F54A}", "\u{1F994}"],
      "unit": ["\u{1F916}", "\u2708"],
      "building": ["\u{1F3DB}"],
      "society": ["\u{1F3AA}", "\u{1F3D8}", "\u{1F3D9}", "\u{1F3F0}", "\u{1F5FF}", "\u{1F4A9}"],
      "mineral": ["\u2B53", "\u2B20", "\u{1F48E}", "\u{1F331}", "\u{1F332}", "\u{1F333}", "\u{1F334}", "\u{1F335}", "\u{1F33E}", "\u{1F344}", "\u{1F33A}", "\u{1F33B}"]
    };
    colorMap = {
      "player": 2003199,
      "fauna": 2263842,
      "unit": 16753920,
      "building": 9127187,
      "society": 52945,
      "mineral": 8388736
    };
    constructor(scene, matFactory) {
      this.scene = scene;
      this.matFactory = matFactory;
      this.loader = new THREE.BufferGeometryLoader();
    }
    update(entities) {
      const activeIds = /* @__PURE__ */ new Set();
      for (const entity of entities) {
        activeIds.add(entity.id);
        const color = this.colorMap[entity.type] || 16777215;
        const char = this.getChar(entity);
        this.syncMesh(entity, char, color);
      }
      for (const [id, mesh] of this.meshes) {
        if (!activeIds.has(id)) {
          this.scene.remove(mesh);
          this.meshes.delete(id);
        }
      }
    }
    getChar(entity) {
      const chars = this.charMap[entity.type] || ["?"];
      const idLen = entity.id.length;
      const charIdx = entity.id.charCodeAt(idLen - 1);
      return chars[charIdx % chars.length];
    }
    syncMesh(ent, char, color) {
      let mesh = this.getOrCreate(ent, char, color);
      if (mesh) {
        const isStationary = mesh.geometry?.userData?.metadata?.isStationary;
        if (isStationary) {
          if (mesh.position.distanceTo(ent.pos) > 1) {
            mesh.position.copy(ent.pos);
          }
        } else {
          mesh.position.copy(ent.pos);
        }
      }
    }
    getOrCreate(ent, char, color) {
      const id = ent.id;
      const cp = char.codePointAt(0);
      const hex = cp.toString(16).toUpperCase();
      let mesh = this.meshes.get(id);
      if (!mesh) {
        const box = new THREE.BoxGeometry(0.5, 0.5, 0.5);
        mesh = new THREE.Mesh(box, this.matFactory(color));
        this.scene.add(mesh);
        this.meshes.set(id, mesh);
        this.fetchGeo(id, hex);
        return mesh;
      }
      const cached = this.geoCache.get(hex);
      const isBox = mesh.geometry.type === "BoxGeometry";
      if (cached && !(cached instanceof Promise) && isBox) {
        return this.replaceGeo(ent, cached);
      }
      return mesh;
    }
    fetchGeo(id, hex) {
      if (this.geoCache.has(hex)) return;
      const url = `assets/entity_geometry/${hex}.json`;
      this.geoCache.set(hex, new Promise(() => {
      }));
      fetch(url).then((res) => res.ok ? res.json() : null).then((json) => {
        if (!json) {
          console.warn("Failed to fetch model:", hex);
          return;
        }
        const geo = this.loader.parse(json);
        if (json.mutonex_entity_metadata) {
          geo.userData.metadata = json.mutonex_entity_metadata;
          const matrix = new THREE.Matrix4().fromArray(json.mutonex_entity_metadata.transform.matrix);
          geo.applyMatrix4(matrix);
        }
        this.geoCache.set(hex, geo);
      }).catch((e) => console.error("Geo fetch fail", hex, e));
    }
    replaceGeo(ent, geo) {
      const id = ent.id;
      const ex = this.meshes.get(id);
      if (!ex) return null;
      this.scene.remove(ex);
      const next = new THREE.Mesh(geo, ex.material);
      next.position.copy(ex.position);
      this.scene.add(next);
      this.meshes.set(id, next);
      return next;
    }
  };

  // webclient/LidarShaders.ts
  var LidarVertexShader = `
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
  var LidarFragmentShader = `
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
            // diagMode = 2.0: raw depth greyscale \u2014 proves depth texture read
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
  var ProceduralMeshVertexShader = `
    varying float vViewZ;
    varying vec3 vViewPosition;
    varying vec3 vNormal;
    varying vec2 vLidarTexCoord;

    void main() {
        vec4 vPos = modelViewMatrix * vec4(position, 1.0);
        vViewZ = -vPos.z; 
        vViewPosition = vPos.xyz;
        vNormal = normalize(normalMatrix * normal);

        // Calculate texture coordinates based on the LIDAR scan geometry and the object's surface.
        // This generates parametric UVs relative to the camera origin that conform
        // to the physical shape of the object during perspective interpolation.
        vLidarTexCoord = vec2(
            atan(vViewPosition.x, -vViewPosition.z),
            vViewPosition.z
        );

        gl_Position = projectionMatrix * vPos;
    }
`;
  var ProceduralMeshFragmentShader = `
    uniform float far;
    uniform vec3 uColor;
    uniform float uProceduralMode; // 0.0 = offscreen pack, 1.0 = camera-space projection
    uniform float time;
    
    varying float vViewZ;
    varying vec3 vViewPosition;
    varying vec3 vNormal;
    varying vec2 vLidarTexCoord;

    void main() {
        if (uProceduralMode < 0.5) {
            // Mode 0: Default Depth+Color render pass for PointCloud Sprites
            gl_FragColor = vec4(uColor, vViewZ / far);
        } else {
            // Mode 1: Camera-Space Procedural Projection (Native Mesh Texturing)
            float depth = clamp(vViewZ, 1.0, far);

            // Use the texture coordinates evaluated on the 3D vertex surfaces
            // This ensures the stripes deform and map to the physical structural geometry.
            float yawAngle = vLidarTexCoord.x;
            
            // Calculate 77 vertical scanlines across the Camera's Field of View.
            // Using a standard 75-degree FOV (~1.309 radians).
            // 1.309 / 77 stripes = ~0.017 radians per stripe
            float stripeSpacing = 0.017;       // Spacing for 77 vertical stripes
            float stripeWidth = 0.002;         // Very sharp laser line width
            
            // Evaluates strictly to vertical stripes mapped to object contours!
            float slice = mod(yawAngle, stripeSpacing);
            float isStripe = step(slice, stripeWidth);

            // Map the texture explicitly to Object Normals (Lambertian Reflectance)
            // The Lidar beam originates from the camera lens (view-space origin).
            vec3 viewDirection = normalize(vViewPosition);
            vec3 nNormal = normalize(vNormal);
            float lambert = max(0.0, dot(nNormal, -viewDirection));
            
            // 3. Apply the Orange Palette (1700K - 3800K) based on Depth
            // Normalizing depth to a 0.0 - 1.0 range based on 'far' clip plane
            float normalizedDepth = clamp(depth / 80.0, 0.0, 1.0);
            
            vec3 nearColor = vec3(1.0, 0.77, 0.54);  // ~3800K (#ffc48a)
            vec3 farColor  = vec3(0.4, 0.1, 0.0);    // ~1700K (#661a00)
            
            // Reversing the interpolation: distanceFade is 1.0 at camera, 0.0 far away.
            // So we mix based on normalizedDepth directly (0.0 at camera, 1.0 far away).
            vec3 paletteColor = mix(nearColor, farColor, normalizedDepth);
            
            // Mix 25% of the underlying object color into the procedural Lidar palette
            // to ensure units still retain their team color tint during scans.
            vec3 stripeColor = mix(paletteColor, uColor, 0.25);
            
            // Illumination falloff
            float illumination = lambert * 0.9 + 0.1;
            float distanceFade = 1.0 - normalizedDepth;
            distanceFade = pow(distanceFade, 3.0); 

            // If it's not a Lidar stripe, render nothing (pure black void with no shading).
            if (isStripe < 0.5) {
                gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
            } else {
                // Modulate the stripe color by the physical surface lighting and distance fade
                vec3 finalHit = stripeColor * illumination * 3.0 * distanceFade;
                gl_FragColor = vec4(finalHit, 1.0);
            }
        }
    }
`;

  // webclient/LidarStyles.ts
  var LidarStyles = {
    pointCloud: {
      name: "pointCloud",
      geometryMode: "Points",
      scanMode: 1,
      dotType: 1,
      samplesH: 480,
      samplesV: 300,
      dotRadiusMin: 1,
      dotRadiusMax: 4
    },
    lineLidar: {
      name: "lineLidar",
      geometryMode: "Points",
      scanMode: 0,
      dotType: 1,
      samplesH: 400,
      samplesV: 290,
      // Task 3: dynamic high resolution vertical mode
      dotRadiusMin: 0,
      dotRadiusMax: 5
    },
    legacy: {
      name: "legacy",
      geometryMode: "Points",
      scanMode: 1,
      dotType: 0,
      samplesH: 400,
      samplesV: 280,
      dotRadiusMin: 1,
      dotRadiusMax: 4
    },
    densePointGridVertical: {
      name: "densePointGridVertical",
      geometryMode: "Points",
      scanMode: 0,
      dotType: 1,
      samplesH: 800,
      samplesV: 560,
      dotRadiusMin: 1,
      dotRadiusMax: 6
    },
    densePointGridHorizontal: {
      name: "densePointGridHorizontal",
      geometryMode: "Points",
      scanMode: 1,
      dotType: 1,
      samplesH: 480,
      samplesV: 300,
      dotRadiusMin: 1,
      dotRadiusMax: 4
    },
    proceduralLidar: {
      name: "proceduralLidar",
      geometryMode: "Points",
      scanMode: 0,
      dotType: 0,
      samplesH: 10,
      samplesV: 10,
      dotRadiusMin: 0,
      dotRadiusMax: 0
    }
  };

  // webclient/LidarView.ts
  var LidarView = class {
    scene;
    // THREE.Scene
    camera;
    // THREE.PerspectiveCamera
    // Dot Rendering Parameters
    currentStyleName = "pointCloud";
    dotRadiusMin = 1;
    // Radius for objects far away (vDist >= 30.0)
    dotRadiusMax = 4;
    // Radius for objects very close (vDist == 0.0)
    dotType = 1;
    // 0.0 = square, 1.0 = circular
    samplesH = 480;
    samplesV = 300;
    entropy = 0.1;
    // Parametric signal loss (0=no noise, 1=max)
    // The "Virtual" scene contains the actual geometry
    virtualScene;
    // THREE.Scene
    entityRenderer;
    renderTarget;
    baseMaterials = /* @__PURE__ */ new Map();
    controls;
    renderer = null;
    boundResize;
    loader;
    lidarMaterial;
    lidarPoints;
    modelCache = /* @__PURE__ */ new Map();
    isRebuildingBuffer = false;
    pendingStyleConfig = null;
    constructor(domElement) {
      this.initMainScene(domElement);
      this.initVirtualScene();
      this.initRenderTarget();
      this.entityRenderer = new EntityRenderer(
        this.virtualScene,
        (color) => this.getLidarBaseMaterial(color)
      );
      this.lidarMaterial = this.createLidarShader();
      this.createGroundGrid();
      this.startBufferRebuild(LidarStyles.pointCloud);
      this.loader = new THREE.BufferGeometryLoader();
      this.boundResize = this.onWindowResize.bind(this);
    }
    initMainScene(domElement) {
      this.scene = new THREE.Scene();
      this.scene.background = new THREE.Color(327936);
      const w = window.innerWidth;
      const h = window.innerHeight;
      this.camera = new THREE.PerspectiveCamera(
        75,
        w / h,
        0.1,
        1e3
      );
      this.camera.position.set(10, 1.7, 10);
      this.controls = new FirstPersonControls(
        this.camera,
        domElement
      );
    }
    initVirtualScene() {
      this.virtualScene = new THREE.Scene();
      this.virtualScene.background = new THREE.Color(0);
      const debugGeo = new THREE.SphereGeometry(1.5, 16, 16);
      const debugMat = this.getLidarBaseMaterial(16711680);
      const debugMesh = new THREE.Mesh(debugGeo, debugMat);
      debugMesh.position.set(0, 1.5, 10);
      this.virtualScene.add(debugMesh);
    }
    initRenderTarget() {
      const w = window.innerWidth;
      const h = window.innerHeight;
      this.renderTarget = new THREE.WebGLRenderTarget(w, h, {
        minFilter: THREE.NearestFilter,
        magFilter: THREE.NearestFilter,
        format: THREE.RGBAFormat,
        type: THREE.FloatType
      });
    }
    getLidarBaseMaterial(colorHex) {
      let mat = this.baseMaterials.get(colorHex);
      if (!mat) {
        mat = new THREE.ShaderMaterial({
          uniforms: {
            far: { value: this.camera.far },
            uColor: { value: new THREE.Color(colorHex) },
            uProceduralMode: { value: 0 },
            time: { value: 0 }
          },
          vertexShader: ProceduralMeshVertexShader,
          fragmentShader: ProceduralMeshFragmentShader
        });
        this.baseMaterials.set(colorHex, mat);
      }
      return mat;
    }
    setLidarStyle(styleName) {
      const config = LidarStyles[styleName] || LidarStyles.pointCloud;
      this.currentStyleName = styleName;
      this.samplesH = config.samplesH;
      this.samplesV = config.samplesV;
      this.dotType = config.dotType;
      this.dotRadiusMin = config.dotRadiusMin;
      this.dotRadiusMax = config.dotRadiusMax;
      if (this.lidarMaterial) {
        this.lidarMaterial.uniforms.scanMode.value = config.scanMode;
        this.lidarMaterial.uniforms.dotType.value = this.dotType;
        this.lidarMaterial.uniforms.dotRadiusMin.value = this.dotRadiusMin;
        this.lidarMaterial.uniforms.dotRadiusMax.value = this.dotRadiusMax;
      }
      const isProcedural = styleName === "proceduralLidar";
      if (isProcedural) {
        this.scene.add(this.virtualScene);
        if (this.lidarPoints) this.lidarPoints.visible = false;
      } else {
        this.scene.remove(this.virtualScene);
        if (this.lidarPoints) this.lidarPoints.visible = true;
      }
      for (const mat of this.baseMaterials.values()) {
        mat.uniforms.uProceduralMode.value = isProcedural ? 1 : 0;
      }
      if (this.isRebuildingBuffer) {
        this.pendingStyleConfig = styleName;
      } else {
        this.startBufferRebuild(config);
      }
    }
    startBufferRebuild(config) {
      this.isRebuildingBuffer = true;
      this.pendingStyleConfig = null;
      const gen = this.chunkedGeometryGenerator(config.samplesH, config.samplesV);
      const processChunk = () => {
        const result = gen.next();
        if (!result.done) {
          requestAnimationFrame(processChunk);
        } else {
          this.isRebuildingBuffer = false;
          if (this.lidarPoints) {
            this.scene.remove(this.lidarPoints);
            this.lidarPoints.geometry.dispose();
          }
          this.lidarPoints = result.value;
          this.scene.add(this.lidarPoints);
          if (this.pendingStyleConfig) {
            this.setLidarStyle(this.pendingStyleConfig);
          }
        }
      };
      requestAnimationFrame(processChunk);
    }
    *chunkedGeometryGenerator(samplesH, samplesV) {
      const geometry = new THREE.BufferGeometry();
      const totalPoints = samplesH * samplesV;
      const positions = new Float32Array(totalPoints * 3);
      const uvs = new Float32Array(totalPoints * 2);
      const chunkSize = 5e4;
      let currentIdx = 0;
      for (let y = 0; y < samplesV; y++) {
        for (let x = 0; x < samplesH; x++) {
          uvs[currentIdx * 2] = x / (samplesH - 1);
          uvs[currentIdx * 2 + 1] = y / (samplesV - 1);
          currentIdx++;
          if (currentIdx % chunkSize === 0) {
            yield;
          }
        }
      }
      geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
      const newGeometryGroup = new THREE.Points(geometry, this.lidarMaterial);
      newGeometryGroup.frustumCulled = false;
      return newGeometryGroup;
    }
    createLidarShader() {
      const resolution = new THREE.Vector2(
        window.innerWidth,
        window.innerHeight
      );
      const uniforms = {
        tDepth: { value: null },
        cameraNear: { value: 0.1 },
        cameraFar: { value: 1e3 },
        viewInverse: { value: new THREE.Matrix4() },
        projectionInverse: {
          value: new THREE.Matrix4()
        },
        resolution: { value: resolution },
        time: { value: 0 },
        scanMode: { value: LidarStyles[this.currentStyleName]?.scanMode ?? 1 },
        entropy: { value: this.entropy },
        // diagMode: 0.0 = normal rendering, 1.0 = diagnostic (red=elevated, blue=ground).
        // Toggle from browser console: lidarView.lidarMaterial.uniforms.diagMode.value = 1.0
        diagMode: { value: 0 },
        dotType: { value: this.dotType },
        dotRadiusMin: { value: this.dotRadiusMin },
        dotRadiusMax: { value: this.dotRadiusMax }
      };
      return new THREE.ShaderMaterial({
        uniforms,
        vertexShader: LidarVertexShader,
        fragmentShader: LidarFragmentShader,
        transparent: true,
        depthWrite: false,
        // Task 6: Disable depthWrite to fix occlusion sorting with AdditiveBlending
        blending: THREE.AdditiveBlending
      });
    }
    updateTerrain(terrain) {
    }
    updateEntities(entities) {
      this.entityRenderer.update(entities);
    }
    createGroundGrid() {
      const geo = new THREE.PlaneGeometry(
        200,
        200,
        100,
        100
      );
      const mat = this.getLidarBaseMaterial(3355443);
      const plane = new THREE.Mesh(geo, mat);
      plane.rotation.x = -Math.PI / 2;
      this.virtualScene.add(plane);
    }
    onActivate() {
      window.addEventListener(
        "resize",
        this.boundResize
      );
      if (this.controls) {
        this.controls.enabled = true;
      }
    }
    onDeactivate() {
      window.removeEventListener(
        "resize",
        this.boundResize
      );
      if (this.controls) {
        this.controls.enabled = false;
      }
    }
    dispose() {
      if (this.controls) {
        this.controls.dispose();
      }
    }
    update(deltaTime) {
      this.controls.update();
      if (this.lidarMaterial) {
        const u = this.lidarMaterial.uniforms;
        u.time.value += deltaTime;
        if (u.entropy) u.entropy.value = this.entropy;
        if (u.dotType) u.dotType.value = this.dotType;
        if (u.dotRadiusMin) u.dotRadiusMin.value = this.dotRadiusMin;
        if (u.dotRadiusMax) u.dotRadiusMax.value = this.dotRadiusMax;
      }
      for (const mat of this.baseMaterials.values()) {
        mat.uniforms.time.value += deltaTime;
      }
      this.virtualScene.updateMatrixWorld(true);
    }
    preRender(renderer) {
      this.renderer = renderer;
      if (this.currentStyleName === "proceduralLidar") {
        for (const mat of this.baseMaterials.values()) {
          mat.uniforms.far.value = this.camera.far;
        }
        return;
      }
      const uniforms = this.lidarMaterial.uniforms;
      uniforms.tDepth.value = this.renderTarget.texture;
      uniforms.cameraNear.value = this.camera.near;
      uniforms.cameraFar.value = this.camera.far;
      const projInv = this.camera.projectionMatrixInverse;
      uniforms.projectionInverse.value.copy(projInv);
      const mw = this.camera.matrixWorld;
      uniforms.viewInverse.value.copy(mw);
      const currentRT = renderer.getRenderTarget();
      renderer.setRenderTarget(this.renderTarget);
      renderer.setClearColor(0, 1);
      renderer.clear();
      for (const mat of this.baseMaterials.values()) {
        mat.uniforms.far.value = this.camera.far;
      }
      const prevBackground = this.virtualScene.background;
      this.virtualScene.background = null;
      renderer.render(this.virtualScene, this.camera);
      this.virtualScene.background = prevBackground;
      renderer.setRenderTarget(currentRT);
    }
    onWindowResize() {
      const w = window.innerWidth;
      const h = window.innerHeight;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderTarget.setSize(w, h);
      const res = this.lidarMaterial.uniforms.resolution;
      res.value.set(w, h);
    }
  };

  // webclient/TerrainMesh.ts
  function createTerrainMesh(terrain) {
    const { width, height } = terrain.size;
    const geometry = new THREE.PlaneGeometry(
      width,
      height,
      width - 1,
      height - 1
    );
    const vertices = geometry.attributes.position.array;
    let ptr = 2;
    for (const row of terrain.data) {
      for (const z of row) {
        vertices[ptr] = z;
        ptr += 3;
      }
    }
    geometry.rotateX(-Math.PI / 2);
    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();
    const material = new THREE.MeshLambertMaterial({
      color: 8956552,
      wireframe: false
    });
    const mesh = new THREE.Mesh(geometry, material);
    return mesh;
  }

  // webclient/SphereView.ts
  var SphereView = class {
    scene;
    camera;
    controls;
    entityRenderer;
    boundResize;
    constructor(domElement) {
      this.scene = new THREE.Scene();
      this.scene.background = new THREE.Color(15658734);
      this.camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        1e3
      );
      this.camera.position.set(10, 1.7, 10);
      const ambientLight = new THREE.AmbientLight(
        16777215,
        0.6
      );
      this.scene.add(ambientLight);
      const directionalLight = new THREE.DirectionalLight(
        16777215,
        0.8
      );
      directionalLight.position.set(50, 50, 50);
      this.scene.add(directionalLight);
      this.controls = new FirstPersonControls(
        this.camera,
        domElement
      );
      this.entityRenderer = new EntityRenderer(
        this.scene,
        (color) => new THREE.MeshBasicMaterial({ color })
      );
      this.boundResize = this.onWindowResize.bind(this);
    }
    updateTerrain(terrain) {
      const mesh = createTerrainMesh(terrain);
      this.scene.add(mesh);
    }
    updateEntities(entities) {
      this.entityRenderer.update(entities);
    }
    update(deltaTime) {
      this.controls.update();
    }
    onActivate() {
      window.addEventListener(
        "resize",
        this.boundResize
      );
      if (this.controls) {
        this.controls.enabled = true;
      }
    }
    onDeactivate() {
      window.removeEventListener(
        "resize",
        this.boundResize
      );
      if (this.controls) {
        this.controls.enabled = false;
      }
    }
    dispose() {
      if (this.controls) {
        this.controls.dispose();
      }
    }
    onWindowResize() {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
    }
  };

  // webclient/LobbyView.ts
  var LobbyView = class {
    container;
    sectorContainer;
    sectorListContainer;
    queueContainer;
    playerListContainer;
    sectors = [];
    selectedIndex = 0;
    onSelectCallback = null;
    boundInput;
    isConnected = false;
    constructor() {
      this.container = document.getElementById(
        "lobby-view"
      );
      this.sectorContainer = document.getElementById(
        "sector-selection"
      );
      this.sectorListContainer = document.getElementById(
        "sector-list-container"
      );
      this.queueContainer = document.getElementById(
        "lobby-queue"
      );
      this.playerListContainer = document.getElementById(
        "player-list-container"
      );
      if (!this.container) {
        throw new Error("Lobby view container not found");
      }
      this.boundInput = this.handleInput.bind(this);
      window.addEventListener(
        "keydown",
        this.boundInput
      );
    }
    show() {
      this.container.classList.remove("hidden");
    }
    hide() {
      this.container.classList.add("hidden");
    }
    renderSectorList(sectors) {
      this.sectors = sectors;
      this.sectorListContainer.innerHTML = "";
      sectors.forEach((sector, index) => {
        const div = document.createElement("div");
        const isSelected = index === this.selectedIndex;
        const baseClass = "list-item";
        div.className = isSelected ? `${baseClass} selected` : baseClass;
        let text = sector.name;
        if (sector.players_count !== void 0) {
          text += ` (${sector.players_count})`;
        }
        div.textContent = text;
        div.onclick = () => this.selectSector(index);
        this.sectorListContainer.appendChild(div);
      });
    }
    updatePlayerQueue(players) {
      if (!this.isConnected) {
        this.isConnected = true;
        this.sectorContainer.style.display = "none";
        this.queueContainer.style.display = "block";
      }
      this.playerListContainer.innerHTML = "";
      players.forEach((player) => {
        const id = player[0];
        const div = document.createElement("div");
        div.className = "list-item";
        div.style.cursor = "default";
        div.textContent = `Player ${id}`;
        this.playerListContainer.appendChild(div);
      });
    }
    onSectorSelect(callback) {
      this.onSelectCallback = callback;
    }
    selectSector(index) {
      if (index < 0 || index >= this.sectors.length) return;
      this.selectedIndex = index;
      this.renderSectorList(this.sectors);
      if (this.onSelectCallback) {
        const selected = this.sectors[this.selectedIndex];
        this.onSelectCallback(selected);
      }
    }
    handleInput(e) {
      const isHidden = this.container.classList.contains(
        "hidden"
      );
      if (isHidden) return;
      if (this.isConnected) return;
      if (e.key === "ArrowUp") {
        const len = this.sectors.length;
        this.selectedIndex = (this.selectedIndex - 1 + len) % len;
        this.renderSectorList(this.sectors);
      } else if (e.key === "ArrowDown") {
        const len = this.sectors.length;
        this.selectedIndex = (this.selectedIndex + 1) % len;
        this.renderSectorList(this.sectors);
      } else if (e.key === "Enter") {
        this.selectSector(this.selectedIndex);
      }
    }
  };

  // webclient/AvatarController.ts
  var AvatarController = class {
    viewManager;
    stateProvider;
    position = new THREE.Vector3(10, 0, 10);
    lastSent = new THREE.Vector3();
    keys = {};
    // GC pre-allocations
    moveDir = new THREE.Vector3();
    forward = new THREE.Vector3();
    right = new THREE.Vector3();
    moveVec = new THREE.Vector3();
    tempV = new THREE.Vector3(0, 0, -1);
    tempR = new THREE.Vector3(1, 0, 0);
    speed = 20;
    constructor(viewManager, stateProvider) {
      this.viewManager = viewManager;
      this.stateProvider = stateProvider;
      window.addEventListener(
        "keydown",
        (e) => this.keys[e.key.toLowerCase()] = true
      );
      window.addEventListener(
        "keyup",
        (e) => this.keys[e.key.toLowerCase()] = false
      );
    }
    update(delta) {
      const provider = this.stateProvider();
      if (!provider || provider.phase !== "gamein") return;
      this.calculateDirection();
      if (this.moveDir.lengthSq() > 0) {
        this.moveDir.normalize();
        this.moveVec.copy(this.moveDir).multiplyScalar(
          this.speed * delta
        );
        const view = this.viewManager.getActiveView();
        if (view) view.camera.position.add(this.moveVec);
        this.position.add(this.moveVec);
        this.syncState(provider);
      }
    }
    calculateDirection() {
      this.moveDir.set(0, 0, 0);
      const view = this.viewManager.getActiveView();
      if (!view) return;
      const cam = view.camera;
      this.forward.copy(this.tempV).applyQuaternion(
        cam.quaternion
      );
      this.forward.y = 0;
      this.forward.normalize();
      this.right.copy(this.tempR).applyQuaternion(
        cam.quaternion
      );
      this.right.y = 0;
      this.right.normalize();
      if (this.keys["w"] || this.keys["arrowup"]) {
        this.moveDir.add(this.forward);
      }
      if (this.keys["s"] || this.keys["arrowdown"]) {
        this.moveDir.sub(this.forward);
      }
      if (this.keys["a"] || this.keys["arrowleft"]) {
        this.moveDir.sub(this.right);
      }
      if (this.keys["d"] || this.keys["arrowright"]) {
        this.moveDir.add(this.right);
      }
    }
    syncState(provider) {
      if (this.position.distanceTo(this.lastSent) > 1) {
        provider.sendAvatarPosition([
          this.position.x,
          this.position.z,
          0
        ]);
        this.lastSent.copy(this.position);
      }
    }
    isPressed(key) {
      return !!this.keys[key.toLowerCase()];
    }
  };

  // webclient/FeatureCardHUD.ts
  var FeatureCardHUD = class {
    container;
    charmValueEl = null;
    onCharmClick;
    constructor() {
      this.container = document.getElementById("hud-overlay");
      if (!this.container) {
        console.error("Missing #hud-overlay element");
        return;
      }
    }
    setOnCharmClick(cb) {
      this.onCharmClick = cb;
    }
    setCharmLevel(level) {
      if (this.charmValueEl) {
        this.charmValueEl.innerText = level.toString();
      }
    }
    show() {
      this.render();
    }
    hide() {
      this.container.innerHTML = "";
    }
    render() {
      this.container.innerHTML = `
            <div class="feature-card" id="hud-charm-card">
                <div class="card-title">CHARM</div>
                <div class="card-value">0</div>
            </div>
        `;
      this.charmValueEl = this.container.querySelector(".card-value");
      const card = this.container.querySelector("#hud-charm-card");
      card?.addEventListener("click", () => {
        if (this.onCharmClick) this.onCharmClick();
      });
    }
  };

  // webclient/main.ts
  function main() {
    const canvas = document.getElementById(
      "main-canvas"
    );
    if (!canvas) {
      console.error("Main canvas not found");
      return;
    }
    const viewManager = new ViewManager(canvas);
    const lidarView = new LidarView(canvas);
    const sphereView = new SphereView(canvas);
    viewManager.setActiveView(lidarView);
    window.__mutonex = {
      lidarView,
      viewManager,
      renderer: viewManager.renderer
    };
    window.__mutonex.lidarView.setStyle = (styleName) => {
      if (LidarStyles[styleName]) {
        lidarView.setLidarStyle(styleName);
      }
    };
    console.log(
      "%cMutonex Webclient%c\n\nControls:\n  Left Click + Drag  : Rotate camera\n  Right Click + Drag : Pan camera\n  Scroll Wheel       : Zoom in/out\n\nLidar Rendering:\n  To change Lidar scanning modes, use the console command:\n  %cwindow.__mutonex.lidarView.setStyle('styleName')%c\n\nAvailable Styles:\n" + Object.keys(LidarStyles).map((s) => `  - ${s}`).join("\n"),
      "font-size: 16px; font-weight: bold; color: #1E90FF;",
      "",
      "background: #222; color: #0f0; padding: 2px 4px; border-radius: 2px;",
      ""
    );
    viewManager.animate();
    const lobbyView = new LobbyView();
    const mockSectors = [
      { id: "game:sector_alpha", name: "Sector Alpha (Dev)" },
      { id: "game:sector_beta", name: "Sector Beta (Test)" },
      { id: "game:sector_gamma", name: "Sector Gamma (High Pop)" }
    ];
    lobbyView.renderSectorList(mockSectors);
    let gameStateProvider = null;
    const featureHUD = new FeatureCardHUD();
    const entities = [];
    const playerAnchors = /* @__PURE__ */ new Map();
    const playerCharm = /* @__PURE__ */ new Map();
    const faunaAnchors = /* @__PURE__ */ new Map();
    const faunaTargets = /* @__PURE__ */ new Map();
    const mineralAnchors = /* @__PURE__ */ new Map();
    const avatar = new AvatarController(
      viewManager,
      () => gameStateProvider
    );
    let currentTerrain = null;
    const updateEntitiesList = (interpolatedPositions) => {
      entities.length = 0;
      for (const [id, pos] of playerAnchors) {
        entities.push({
          id,
          type: "player",
          pos: pos.clone(),
          char: "",
          charm: playerCharm.get(id) || 0
        });
      }
      for (const [id, anchorPos] of faunaAnchors) {
        const pos = interpolatedPositions?.get(id) || anchorPos;
        entities.push({
          id,
          type: "fauna",
          pos: pos.clone(),
          char: ""
        });
      }
      for (const [id, anchorPos] of mineralAnchors) {
        entities.push({
          id,
          type: "mineral",
          pos: anchorPos.clone(),
          char: ""
        });
      }
      const activeView = viewManager.getActiveView();
      if (activeView) activeView.updateEntities(entities);
    };
    const onInitialState = (gameState) => {
      if (gameState.terrain) {
        currentTerrain = gameState.terrain;
        lidarView.updateTerrain(currentTerrain);
        sphereView.updateTerrain(currentTerrain);
      }
      if (gameStateProvider?.phase === "lobby") {
        lobbyView.show();
        if (gameState.players) {
          lobbyView.updatePlayerQueue(gameState.players);
        }
      } else {
        lobbyView.hide();
        featureHUD.show();
        if (gameState.players) updatePlayerAnchors(gameState.players);
      }
      if (gameState.fauna) updateFaunaAnchors(gameState.fauna);
      if (gameState.minerals) updateMineralAnchors(gameState.minerals);
      updateEntitiesList();
    };
    const onStateUpdate = (update) => {
      if (gameStateProvider?.phase === "lobby") {
        lobbyView.show();
        if (update.players) lobbyView.updatePlayerQueue(update.players);
      } else {
        lobbyView.hide();
        featureHUD.show();
        if (update.players) updatePlayerAnchors(update.players);
      }
      if (update.fauna) updateFaunaAnchors(update.fauna);
    };
    const joinSector = (sector) => {
      if (gameStateProvider) return;
      gameStateProvider = new GameStateProvider(
        sector.id,
        onInitialState,
        onStateUpdate
      );
      gameStateProvider.start();
      startUpdateLoop();
    };
    lobbyView.onSectorSelect(joinSector);
    lobbyView.show();
    const params = new URLSearchParams(window.location.search);
    if (params.get("join") !== "false") {
      setTimeout(() => joinSector(mockSectors[0]), 2e3);
    }
    featureHUD.setOnCharmClick(() => {
      if (!gameStateProvider || gameStateProvider.phase !== "gamein") return;
      let nearestTargetId = null;
      let minDistance = 20;
      for (const ent of entities) {
        if (ent.id === gameStateProvider.playerId) continue;
        const dist = avatar.position.distanceTo(ent.pos);
        if (dist < minDistance) {
          minDistance = dist;
          nearestTargetId = ent.id;
        }
      }
      if (nearestTargetId) {
        console.log(`[Charm] Attempting to charm target: ${nearestTargetId} at dist ${minDistance.toFixed(2)}`);
        gameStateProvider.sendPlayerAction("charm", nearestTargetId);
      } else {
        console.log("[Charm] No valid targets within range.");
      }
    });
    function startUpdateLoop() {
      const FAUNA_SPEED = 0.5;
      let lastTime = performance.now();
      window.addEventListener("keydown", (e) => {
        if (e.key === "Tab") {
          e.preventDefault();
          const current = viewManager.getActiveView();
          const next = current === lidarView ? sphereView : lidarView;
          viewManager.setActiveView(next);
          if (currentTerrain) next.updateTerrain(currentTerrain);
          updateEntitiesList();
        }
        if (e.key.toLowerCase() === "l") {
          const styles = Object.keys(LidarStyles);
          const currentIndex = styles.indexOf(lidarView.currentStyleName);
          const nextIndex = (currentIndex + 1) % styles.length;
          lidarView.setLidarStyle(styles[nextIndex]);
        }
        if (e.key === "[") lidarView.entropy = Math.max(0, lidarView.entropy - 0.1);
        if (e.key === "]") lidarView.entropy = Math.min(1, lidarView.entropy + 0.1);
      });
      function updateLoop() {
        requestAnimationFrame(updateLoop);
        if (gameStateProvider?.phase === "lobby") return;
        const now = performance.now();
        const delta = (now - lastTime) / 1e3;
        lastTime = now;
        const currentInterp = /* @__PURE__ */ new Map();
        for (const [id, anchor] of faunaAnchors) {
          let target = faunaTargets.get(id);
          if (!target) {
            target = anchor.clone();
            faunaTargets.set(id, target);
          }
          const dist = target.distanceTo(anchor);
          if (dist > 5) {
            const dir = new THREE.Vector3().subVectors(anchor, target).normalize();
            target.add(dir.multiplyScalar(FAUNA_SPEED * delta));
          } else {
            target.x += (Math.random() - 0.5) * FAUNA_SPEED * delta * 2;
            target.z += (Math.random() - 0.5) * FAUNA_SPEED * delta * 2;
          }
          currentInterp.set(id, target);
        }
        avatar.update(delta);
        updateEntitiesList(currentInterp);
      }
      updateLoop();
    }
    function updatePlayerAnchors(players) {
      for (const [id, x, y, z, charm] of players) {
        playerAnchors.set(id, new THREE.Vector3(x, 1, z));
        if (charm !== void 0) {
          playerCharm.set(id, charm);
          if (gameStateProvider && id === gameStateProvider.playerId) {
            featureHUD.setCharmLevel(charm);
          }
        }
      }
    }
    function updateFaunaAnchors(fauna) {
      for (const [id, x, y, z] of fauna) {
        faunaAnchors.set(id, new THREE.Vector3(x, 1, z));
      }
    }
    function updateMineralAnchors(minerals) {
      for (const min of minerals) {
        mineralAnchors.set(min.id, new THREE.Vector3(min.position.x, 1, min.position.z));
      }
    }
  }
  window.addEventListener("DOMContentLoaded", main);
})();
