// Declare THREE as a global variable to access it from the <script> tag
declare const THREE: any;

import { GameStateProvider } from "./GameStateProvider.ts";
import { createTerrainMesh } from "./TerrainMesh.ts";
import type { PlayerTuple } from './MockGameStateProvider.ts';

// A simple map to hold our player avatar meshes
const playerMeshes: Map<string, THREE.Mesh> = new Map();
// Map to hold fauna meshes
const faunaMeshes: Map<string, THREE.Mesh> = new Map();
let scene: THREE.Scene;

function main() {
  const canvas = document.getElementById('main-canvas') as HTMLCanvasElement;
  if (!canvas) {
    console.error('Main canvas not found');
    return;
  }

  // --- Basic Three.js Scene Setup ---
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xeeeeee);

  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(15, 20, 30);
  camera.lookAt(10, 0, 10);

  const renderer = new THREE.WebGLRenderer({ canvas });
  renderer.setSize(window.innerWidth, window.innerHeight);

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(50, 50, 50);
  scene.add(directionalLight);
  // --- End Scene Setup ---

  // --- Controls ---
  const controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; // an animation loop is required when either damping or auto-rotation are enabled
  controls.dampingFactor = 0.05;
  controls.screenSpacePanning = false;
  controls.minDistance = 5;
  controls.maxDistance = 500;
  controls.maxPolarAngle = Math.PI / 2;
  // --- End Controls ---

  // Animation loop
  function animate() {
    requestAnimationFrame(animate);
    controls.update(); // only required if controls.enableDamping = true, or if controls.autoRotate = true
    renderer.render(scene, camera);
  }
  animate();

  // --- GameStateProvider Setup ---
  const onInitialState = (gameState: any) => {
    // 1. Render Terrain
    const terrainMesh = createTerrainMesh(gameState.terrain);
    scene.add(terrainMesh);

    // 2. Initial Player Render
    if (gameState.players) updatePlayerAvatars(gameState.players);
    if (gameState.fauna) updateFaunaAvatars(gameState.fauna);
  };

  const onStateUpdate = (update: { players?: PlayerTuple[], fauna?: PlayerTuple[] }) => {
    if (update.players) updatePlayerAvatars(update.players);
    if (update.fauna) updateFaunaAvatars(update.fauna);
  };

  try {
    const gameStateProvider = new GameStateProvider(onInitialState, onStateUpdate);
    gameStateProvider.start();

    // --- Avatar Controls ---
    const keysPressed: { [key: string]: boolean } = {};
    const AVATAR_SPEED = 120.0; // Units per second
    const localPosition = new THREE.Vector3(10, 0, 10); // Start at default
    let lastSentPosition = localPosition.clone();
    let lastTime = performance.now();

    window.addEventListener('keydown', (e) => {
        keysPressed[e.key.toLowerCase()] = true;
    });
    window.addEventListener('keyup', (e) => {
        keysPressed[e.key.toLowerCase()] = false;
    });

    // Hook into the animation loop for smooth updates
    const originalAnimate = animate;
    // We override the animate function (or we could have just added this logic to the existing one)
    // But since `animate` is defined above recursively calling itself, we can't easily hook in without redefining or modifying upstream.
    // Wait, the animate function above calls `requestAnimationFrame(animate)`.
    // It is cleaner to modify the `animate` function definition above.
    // However, since we are in a `replace_with_git_merge_diff` block targeting the end of the file, we can't easily change the function above.
    // Instead, I will implement a separate update loop for physics/network.

    function updateAvatar() {
        requestAnimationFrame(updateAvatar);

        const now = performance.now();
        const delta = (now - lastTime) / 1000;
        lastTime = now;

        const moveDir = new THREE.Vector3(0, 0, 0);

        if (keysPressed['w'] || keysPressed['arrowup']) moveDir.z -= 1;
        if (keysPressed['s'] || keysPressed['arrowdown']) moveDir.z += 1;
        if (keysPressed['a'] || keysPressed['arrowleft']) moveDir.x -= 1;
        if (keysPressed['d'] || keysPressed['arrowright']) moveDir.x += 1;

        if (moveDir.lengthSq() > 0) {
            moveDir.normalize();
            localPosition.add(moveDir.multiplyScalar(AVATAR_SPEED * delta));

            // Check if position changed significantly to send update
            if (localPosition.distanceTo(lastSentPosition) > 0.1) {
                gameStateProvider.sendAvatarPosition([localPosition.x, localPosition.z, 0]); // Note: Server uses X/Y/Z but 2D is X/Y mapped to client X/Z?
                // Wait, previous code: [10 + sin..., 10 + cos..., 0]. Server logs: [14.8..., 8.6..., 0].
                // Client `updatePlayerAvatars`: `mesh.position.set(x, 1, y);` -> server X maps to client X, server Y maps to client Z.
                // So when sending, we should probably send [x, z, 0] or [x, y, 0]?
                // The server entities.ex says: `position: %{x: 0, y: 0, z: 0}`.
                // If the game is 2D heightmap, usually X and Y are the coordinates.
                // Client renders X and Z (Y is up).
                // So client X -> Server X. Client Z -> Server Y.
                // The previous mock was: [10 + sin, 10 + cos, 0].
                // It sent [x, y, 0].
                // So I should send [localPosition.x, localPosition.z, 0].

                lastSentPosition.copy(localPosition);
            }
        }
    }
    updateAvatar();

  } catch (error) {
    console.error("Could not connect to game server:", error);
  }
}

function updatePlayerAvatars(players: PlayerTuple[]) {
    const receivedPlayerIds = new Set(players.map(p => p[0]));

    // Update existing players and add new ones
    for (const playerTuple of players) {
        // Server sends [id, x, y, z]. y is height (usually 0), x/z are 2D coordinates.
        // We map Server X -> Client X, Server Z -> Client Z, Server Y -> Client Y (Height).
        const [id, x, y, z] = playerTuple;
        let mesh = playerMeshes.get(id);

        if (!mesh) {
            // Player is new, create a red sphere for them
            const geometry = new THREE.SphereGeometry(0.5, 16, 16);
            const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
            mesh = new THREE.Mesh(geometry, material);
            playerMeshes.set(id, mesh);
            scene.add(mesh);
        }
        // Update position. Server Y is height, but currently 0. We set height to 1 for visibility.
        // We use Server Z for Client Z.
        // Wait, the tuple is [id, x, y, z].
        // If server logic uses x/y as 2D plane in standard math, often Z is height.
        // But Entities.Player has x, y, z.
        // Let's assume standard 3D mapping: x->x, y->y, z->z.
        // But previously it was `mesh.position.set(x, 1, y)`.
        // If server sends [id, x, 0, z] for a ground unit, we want x, 1, z.
        // Let's use x and z from the tuple.
        mesh.position.set(x, 1, z);
    }

    // Remove players who are no longer in the state
    for (const [id, mesh] of playerMeshes.entries()) {
        if (!receivedPlayerIds.has(id)) {
            scene.remove(mesh);
            playerMeshes.delete(id);
        }
    }
}

function updateFaunaAvatars(fauna: PlayerTuple[]) {
    const receivedFaunaIds = new Set(fauna.map(f => f[0]));

    for (const faunaTuple of fauna) {
        // Server sends [id, x, y, z].
        const [id, x, y, z] = faunaTuple;
        let mesh = faunaMeshes.get(id);

        if (!mesh) {
            // Fauna is a green sphere
            const geometry = new THREE.SphereGeometry(0.3, 16, 16);
            const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
            mesh = new THREE.Mesh(geometry, material);
            faunaMeshes.set(id, mesh);
            scene.add(mesh);
        }
        // Map server coordinates to client. Assuming y is height.
        mesh.position.set(x, 1, z);
    }

    // Remove fauna no longer present
    for (const [id, mesh] of faunaMeshes.entries()) {
        if (!receivedFaunaIds.has(id)) {
            scene.remove(mesh);
            faunaMeshes.delete(id);
        }
    }
}

window.addEventListener("DOMContentLoaded", main);
