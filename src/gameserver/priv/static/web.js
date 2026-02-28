(() => {
  // webclient/GameStateProvider.ts
  var GameStateProvider = class {
    socket;
    channel;
    onInitialState;
    onStateUpdate;
    sectorId;
    phase = "lobby";
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

  // webclient/LidarView.ts
  var POINT_SIZE = 2;
  var LidarView = class {
    scene;
    // THREE.Scene
    camera;
    // THREE.PerspectiveCamera
    samplesH = 120;
    samplesV = 240;
    // The "Virtual" scene contains the actual geometry (Text/Emoticons)
    // It is rendered to a texture, but never shown directly to the user.
    virtualScene;
    // THREE.Scene
    virtualMeshes = /* @__PURE__ */ new Map();
    // THREE.Mesh
    // The Render Target stores the depth information of the virtual scene
    renderTarget;
    // THREE.WebGLRenderTarget
    controls;
    // OrbitControls
    renderer = null;
    // THREE.WebGLRenderer
    // Resources
    loader;
    // THREE.BufferGeometryLoader
    lidarMaterial;
    // THREE.ShaderMaterial
    lidarPoints;
    // THREE.Points
    // Cache for Geometries to optimize performance
    geometryCache = /* @__PURE__ */ new Map();
    // THREE.BufferGeometry
    constructor(domElement) {
      this.scene = new THREE.Scene();
      this.scene.background = new THREE.Color(1280);
      this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1e3);
      this.camera.position.set(0, 10, 20);
      this.controls = new window.THREE.OrbitControls(this.camera, domElement);
      this.controls.enableDamping = true;
      this.controls.autoRotate = true;
      this.controls.autoRotateSpeed = 0.5;
      this.virtualScene = new THREE.Scene();
      this.virtualScene.background = new THREE.Color(0);
      this.renderTarget = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight, {
        minFilter: THREE.NearestFilter,
        magFilter: THREE.NearestFilter,
        format: THREE.RGBAFormat,
        type: THREE.FloatType,
        // High precision for depth
        depthBuffer: true,
        depthTexture: new THREE.DepthTexture(window.innerWidth, window.innerHeight)
      });
      this.renderTarget.depthTexture.type = THREE.FloatType;
      this.lidarMaterial = this.createLidarShader();
      this.rebuildLidarPoints();
      this.loader = new THREE.BufferGeometryLoader();
      this.createGroundGrid();
    }
    setScanMode(mode) {
      if (mode === "vertical") {
        this.samplesH = 120;
        this.samplesV = 240;
      } else {
        this.samplesH = 240;
        this.samplesV = 240;
      }
      this.rebuildLidarPoints();
    }
    rebuildLidarPoints() {
      if (this.lidarPoints) {
        this.scene.remove(this.lidarPoints);
        this.lidarPoints.geometry.dispose();
      }
      const geometry = new THREE.BufferGeometry();
      const positions = [];
      const uvs = [];
      for (let x = 0; x < this.samplesH; x++) {
        for (let y = 0; y < this.samplesV; y++) {
          positions.push(0, 0, 0);
          const u = x / (this.samplesH - 1);
          const v = y / (this.samplesV - 1);
          uvs.push(u, v);
        }
      }
      geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
      geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
      this.lidarPoints = new THREE.Points(geometry, this.lidarMaterial);
      this.scene.add(this.lidarPoints);
    }
    createLidarShader() {
      return new THREE.ShaderMaterial({
        uniforms: {
          tDepth: { value: null },
          // The depth texture
          cameraNear: { value: 0.1 },
          cameraFar: { value: 1e3 },
          viewInverse: { value: new THREE.Matrix4() },
          projectionInverse: { value: new THREE.Matrix4() },
          resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
          time: { value: 0 }
        },
        vertexShader: `
                uniform sampler2D tDepth;
                uniform float cameraNear;
                uniform float cameraFar;
                uniform mat4 viewInverse;
                uniform mat4 projectionInverse;
                uniform float time;

                varying float vDepth;
                varying vec2 vUv;

                // Helper to reconstruct world position from depth
                vec3 getWorldPosition(vec2 uv, float depth) {
                    // Convert to Normalized Device Coordinates (NDC) -1 to 1
                    vec4 ndc = vec4(uv * 2.0 - 1.0, depth * 2.0 - 1.0, 1.0);

                    // Unproject to View Space
                    vec4 viewPos = projectionInverse * ndc;
                    viewPos /= viewPos.w;

                    // Unproject to World Space
                    vec4 worldPos = viewInverse * viewPos;
                    return worldPos.xyz;
                }

                void main() {
                    vUv = uv;

                    // Sample depth from the virtual scene render
                    float depth = texture2D(tDepth, uv).r;
                    vDepth = depth;

                    // If depth is 1.0 (skybox), we push the point off-screen or discard
                    if(depth >= 0.99) {
                        gl_Position = vec4(2.0, 2.0, 2.0, 1.0); // Clip
                        gl_PointSize = 0.0;
                        return;
                    }

                    vec3 worldPos = getWorldPosition(uv, depth);

                    // Add a "wobble" effect to simulate imperfect Lidar sensors
                    // worldPos.x += sin(uv.y * 50.0 + time) * 0.02;

                    gl_Position = projectionMatrix * modelViewMatrix * vec4(worldPos, 1.0);

                    // Size attenuation based on distance
                    vec4 viewPos = modelViewMatrix * vec4(worldPos, 1.0);
                    gl_PointSize = ${POINT_SIZE.toFixed(1)} / -viewPos.z * 10.0;
                }
            `,
        fragmentShader: `
                varying float vDepth;
                varying vec2 vUv;

                void main() {
                    // Simple green color
                    // We can fade color based on depth to simulate signal loss
                    float intensity = 1.0 - smoothstep(0.0, 0.1, vDepth);

                    // Vertical scanline effect aesthetics
                    if (mod(gl_FragCoord.y, 2.0) > 1.0) discard;

                    gl_FragColor = vec4(0.0, 1.0, 0.0, 1.0);
                }
            `,
        transparent: true,
        blending: THREE.AdditiveBlending
      });
    }
    updateTerrain(terrain) {
    }
    updateEntities(entities) {
      const charMap = {
        "player": ["\u{1F9D9}", "\u{101D1}", "\u{101D2}"],
        // Head
        "fauna": ["\u{1F997}", "\u{1F331}", "\u{1F332}"],
        // Fauna (Society)
        "building": ["\u{1F477}", "\u{1F916}", "\u{1F9D5}"],
        // Unit (Building context)
        "mineral": ["\u2B53", "\u2B20", "\u{1F48E}"]
        // Mineral
      };
      const activeIds = /* @__PURE__ */ new Set();
      for (const ent of entities) {
        activeIds.add(ent.id);
        const chars = charMap[ent.type] || ["?"];
        const index = ent.id.charCodeAt(ent.id.length - 1) % chars.length;
        const char = chars[index];
        this.updateVirtualEntity(ent.id, ent.type, ent.pos, char);
      }
      for (const [id, mesh] of this.virtualMeshes) {
        if (!activeIds.has(id)) {
          this.virtualScene.remove(mesh);
          this.virtualMeshes.delete(id);
        }
      }
    }
    // Creates the text geometry in the virtual scene
    updateVirtualEntity(id, type, pos, char) {
      let mesh = this.virtualMeshes.get(id);
      if (!mesh) {
        const hex = char.codePointAt(0).toString(16).toUpperCase();
        let geometry = this.geometryCache.get(hex);
        if (!geometry) {
          const url = `assets/geometry/${hex}.json`;
          this.loader.load(url, (geo) => {
            this.geometryCache.set(hex, geo);
            if (this.virtualMeshes.has(id)) {
              const m = this.virtualMeshes.get(id);
              m.geometry = geo;
            } else {
            }
          }, void 0, (err) => {
            console.warn(`Geometry load failed for ${char} (${hex})`, err);
          });
          geometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
        }
        const material = new THREE.MeshBasicMaterial({ color: 16777215 });
        mesh = new THREE.Mesh(geometry, material);
        this.virtualScene.add(mesh);
        this.virtualMeshes.set(id, mesh);
      } else {
        const hex = char.codePointAt(0).toString(16).toUpperCase();
        const realGeo = this.geometryCache.get(hex);
        if (realGeo && mesh.geometry !== realGeo && mesh.geometry.type === "BoxGeometry") {
          mesh.geometry = realGeo;
        }
      }
      mesh.position.copy(pos);
      mesh.lookAt(this.camera.position);
    }
    createGroundGrid() {
      const geometry = new THREE.PlaneGeometry(200, 200, 20, 20);
      const material = new THREE.MeshBasicMaterial({ wireframe: true });
      const plane = new THREE.Mesh(geometry, material);
      plane.rotation.x = -Math.PI / 2;
      this.virtualScene.add(plane);
    }
    // --- IView Implementation ---
    onActivate() {
      window.addEventListener("resize", this.onWindowResize.bind(this));
    }
    onDeactivate() {
      window.removeEventListener("resize", this.onWindowResize.bind(this));
    }
    update(deltaTime) {
      this.controls.update();
      if (this.lidarMaterial) {
        this.lidarMaterial.uniforms.time.value += deltaTime;
      }
      this.virtualScene.updateMatrixWorld(true);
    }
    preRender(renderer) {
      this.renderer = renderer;
      this.lidarMaterial.uniforms.tDepth.value = this.renderTarget.depthTexture;
      this.lidarMaterial.uniforms.cameraNear.value = this.camera.near;
      this.lidarMaterial.uniforms.cameraFar.value = this.camera.far;
      this.lidarMaterial.uniforms.projectionInverse.value.copy(this.camera.projectionMatrixInverse);
      this.lidarMaterial.uniforms.viewInverse.value.copy(this.camera.matrixWorld);
      const currentRenderTarget = renderer.getRenderTarget();
      renderer.setRenderTarget(this.renderTarget);
      renderer.setClearColor(0);
      renderer.clear();
      renderer.render(this.virtualScene, this.camera);
      renderer.setRenderTarget(currentRenderTarget);
    }
    onWindowResize() {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderTarget.setSize(window.innerWidth, window.innerHeight);
      this.lidarMaterial.uniforms.resolution.value.set(window.innerWidth, window.innerHeight);
    }
  };

  // webclient/TerrainMesh.ts
  function createTerrainMesh(terrain) {
    const { width, height } = terrain.size;
    const geometry = new THREE.PlaneGeometry(width, height, width - 1, height - 1);
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
    const material = new THREE.MeshLambertMaterial({ color: 8956552, wireframe: false });
    const mesh = new THREE.Mesh(geometry, material);
    return mesh;
  }

  // webclient/SphereView.ts
  var SphereView = class {
    scene;
    camera;
    controls;
    playerMeshes = /* @__PURE__ */ new Map();
    // THREE.Mesh
    faunaMeshes = /* @__PURE__ */ new Map();
    // THREE.Mesh
    constructor(domElement) {
      this.scene = new THREE.Scene();
      this.scene.background = new THREE.Color(15658734);
      this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1e3);
      this.camera.position.set(15, 20, 30);
      this.camera.lookAt(10, 0, 10);
      const ambientLight = new THREE.AmbientLight(16777215, 0.6);
      this.scene.add(ambientLight);
      const directionalLight = new THREE.DirectionalLight(16777215, 0.8);
      directionalLight.position.set(50, 50, 50);
      this.scene.add(directionalLight);
      this.controls = new window.THREE.OrbitControls(this.camera, domElement);
      this.controls.enableDamping = true;
      this.controls.dampingFactor = 0.05;
      this.controls.minDistance = 5;
      this.controls.maxDistance = 500;
      this.controls.maxPolarAngle = Math.PI / 2;
    }
    updateTerrain(terrain) {
      const mesh = createTerrainMesh(terrain);
      this.scene.add(mesh);
    }
    updateEntities(entities) {
      const currentIds = /* @__PURE__ */ new Set();
      for (const ent of entities) {
        currentIds.add(ent.id);
        if (ent.type === "player" || ent.type === "building") {
          this.updateMesh(this.playerMeshes, ent.id, ent.pos, 16711680, 0.5);
        } else if (ent.type === "fauna") {
          this.updateMesh(this.faunaMeshes, ent.id, ent.pos, 65280, 0.3);
        }
      }
      this.cleanupMeshes(this.playerMeshes, currentIds);
      this.cleanupMeshes(this.faunaMeshes, currentIds);
    }
    updateMesh(map, id, pos, color, size) {
      let mesh = map.get(id);
      if (!mesh) {
        const geometry = new THREE.SphereGeometry(size, 16, 16);
        const material = new THREE.MeshBasicMaterial({ color });
        mesh = new THREE.Mesh(geometry, material);
        this.scene.add(mesh);
        map.set(id, mesh);
      }
      mesh.position.copy(pos);
    }
    cleanupMeshes(map, currentIds) {
      for (const [id, mesh] of map) {
        if (!currentIds.has(id)) {
          this.scene.remove(mesh);
          map.delete(id);
        }
      }
    }
    update(deltaTime) {
      this.controls.update();
    }
    onActivate() {
      window.addEventListener("resize", this.onWindowResize.bind(this));
    }
    onDeactivate() {
      window.removeEventListener("resize", this.onWindowResize.bind(this));
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
      window.addEventListener(
        "keydown",
        this.handleInput.bind(this)
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
    viewManager.animate();
    const lobbyView = new LobbyView();
    lobbyView.show();
    const mockSectors = [
      { id: "game:lobby", name: "Sector Alpha (Dev)" },
      { id: "game:lobby_beta", name: "Sector Beta (Test)" },
      {
        id: "game:lobby_gamma",
        name: "Sector Gamma (High Pop)"
      }
    ];
    lobbyView.renderSectorList(mockSectors);
    let gameStateProvider = null;
    const entities = [];
    const playerAnchors = /* @__PURE__ */ new Map();
    const faunaAnchors = /* @__PURE__ */ new Map();
    const faunaTargets = /* @__PURE__ */ new Map();
    const localPlayerPos = new THREE.Vector3(10, 0, 10);
    let lastSentPosition = localPlayerPos.clone();
    let currentTerrain = null;
    let lidarMode = "vertical";
    const updateEntitiesList = (interpolatedPositions) => {
      entities.length = 0;
      for (const [id, pos] of playerAnchors) {
        entities.push({
          id,
          type: "player",
          pos: pos.clone(),
          char: ""
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
      const activeView = viewManager.getActiveView();
      if (activeView) {
        activeView.updateEntities(entities);
      }
    };
    const onInitialState = (gameState) => {
      if (gameState.terrain) {
        currentTerrain = gameState.terrain;
        if (currentTerrain) {
          lidarView.updateTerrain(currentTerrain);
          sphereView.updateTerrain(currentTerrain);
        }
      }
      if (gameStateProvider && gameStateProvider.phase === "lobby") {
        if (gameState.players) {
          lobbyView.updatePlayerQueue(gameState.players);
        }
      } else {
        lobbyView.hide();
        if (gameState.players) {
          updatePlayerAnchors(gameState.players);
        }
      }
      if (gameState.fauna) {
        updateFaunaAnchors(gameState.fauna);
      }
      updateEntitiesList();
    };
    const onStateUpdate = (update) => {
      if (gameStateProvider && gameStateProvider.phase === "lobby") {
        if (update.players) {
          lobbyView.updatePlayerQueue(update.players);
        }
      } else {
        lobbyView.hide();
        if (update.players) {
          updatePlayerAnchors(update.players);
        }
      }
      if (update.fauna) updateFaunaAnchors(update.fauna);
    };
    const joinSector = (sector) => {
      console.log(`Connecting: ${sector.name}`);
      console.log(`Sector ID: ${sector.id}`);
      try {
        if (gameStateProvider) return;
        gameStateProvider = new GameStateProvider(
          sector.id,
          onInitialState,
          onStateUpdate
        );
        gameStateProvider.start();
        startUpdateLoop();
      } catch (error) {
        console.error("Could not connect:", error);
      }
    };
    lobbyView.onSectorSelect(joinSector);
    const params = new URLSearchParams(
      window.location.search
    );
    if (params.get("join") !== "false") {
      console.log("Auto-joining first sector...");
      joinSector(mockSectors[0]);
    }
    function startUpdateLoop() {
      const keysPressed = {};
      const AVATAR_SPEED = 20;
      const FAUNA_SPEED = 0.5;
      let lastTime = performance.now();
      window.addEventListener("keydown", (e) => {
        keysPressed[e.key.toLowerCase()] = true;
        if (e.key === "Tab") {
          e.preventDefault();
          const current = viewManager.getActiveView();
          const next = current === lidarView ? sphereView : lidarView;
          viewManager.setActiveView(next);
          if (currentTerrain) {
            next.updateTerrain(currentTerrain);
          }
          updateEntitiesList();
        }
        if (e.key.toLowerCase() === "l") {
          const isVert = lidarMode === "vertical";
          lidarMode = isVert ? "horizontal" : "vertical";
          lidarView.setScanMode(lidarMode);
          console.log("Lidar Mode:", lidarMode);
        }
      });
      window.addEventListener("keyup", (e) => {
        keysPressed[e.key.toLowerCase()] = false;
      });
      function updateLoop() {
        requestAnimationFrame(updateLoop);
        if (gameStateProvider && gameStateProvider.phase === "lobby") {
          return;
        }
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
            const step = FAUNA_SPEED * delta;
            target.add(dir.multiplyScalar(step));
          } else {
            const rx = (Math.random() - 0.5) * FAUNA_SPEED * delta * 2;
            const rz = (Math.random() - 0.5) * FAUNA_SPEED * delta * 2;
            target.x += rx;
            target.z += rz;
          }
          currentInterp.set(id, target);
        }
        const moveDir = new THREE.Vector3(0, 0, 0);
        if (keysPressed["w"] || keysPressed["arrowup"]) {
          moveDir.z -= 1;
        }
        if (keysPressed["s"] || keysPressed["arrowdown"]) {
          moveDir.z += 1;
        }
        if (keysPressed["a"] || keysPressed["arrowleft"]) {
          moveDir.x -= 1;
        }
        if (keysPressed["d"] || keysPressed["arrowright"]) {
          moveDir.x += 1;
        }
        if (gameStateProvider && gameStateProvider.phase === "gamein" && moveDir.lengthSq() > 0) {
          moveDir.normalize();
          const moveVec = moveDir.multiplyScalar(
            AVATAR_SPEED * delta
          );
          const activeView = viewManager.getActiveView();
          if (activeView) {
            activeView.camera.position.add(moveVec);
            const controls = activeView.controls;
            if (controls && controls.target) {
              controls.target.add(moveVec);
            }
          }
          localPlayerPos.add(moveVec);
          const dist = localPlayerPos.distanceTo(
            lastSentPosition
          );
          if (dist > 1) {
            gameStateProvider.sendAvatarPosition([
              localPlayerPos.x,
              localPlayerPos.z,
              0
            ]);
            lastSentPosition.copy(localPlayerPos);
          }
        }
        updateEntitiesList(currentInterp);
      }
      updateLoop();
    }
    function updatePlayerAnchors(players) {
      for (const [id, x, y, z] of players) {
        playerAnchors.set(id, new THREE.Vector3(x, 1, z));
      }
    }
    function updateFaunaAnchors(fauna) {
      for (const [id, x, y, z] of fauna) {
        faunaAnchors.set(id, new THREE.Vector3(x, 1, z));
      }
    }
  }
  window.addEventListener("DOMContentLoaded", main);
})();
