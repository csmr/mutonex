// Declare THREE as a global variable to access it from the <script> tag
declare const THREE: any;

import { GameStateProvider } from "./GameStateProvider.ts";
import { createTerrainMesh } from "./TerrainMesh.ts";
import type { PlayerTuple } from './MockGameStateProvider.ts';

// A simple map to hold our player avatar meshes
const playerMeshes: Map<string, THREE.Mesh> = new Map();
// Map to hold fauna meshes and their target positions for interpolation
const faunaMeshes: Map<string, THREE.Mesh> = new Map();
const faunaTargets: Map<string, THREE.Vector3> = new Map();
const faunaAnchors: Map<string, THREE.Vector3> = new Map(); // Server positions
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
    const AVATAR_SPEED = 2.0; // Units per second (approx 2 km/s simulated)
    const FAUNA_SPEED = 0.5; // Units per second
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
    // Using a separate loop for game logic/interpolation updates
    function updateLoop() {
        requestAnimationFrame(updateLoop);

        const now = performance.now();
        const delta = (now - lastTime) / 1000;
        lastTime = now;

        // --- Fauna Interpolation ---
        // Wandering logic: Move towards local target, update local target from anchor
        for (const [id, mesh] of faunaMeshes.entries()) {
            let target = faunaTargets.get(id);
            const anchor = faunaAnchors.get(id);

            // If no target or reached target, pick new wander point around anchor
            if (!target || mesh.position.distanceTo(target) < 0.1) {
                if (anchor) {
                    // Pick random point within 2.0 units of anchor
                    const theta = Math.random() * Math.PI * 2;
                    const r = Math.random() * 2.0;
                    const wx = anchor.x + r * Math.cos(theta);
                    const wz = anchor.z + r * Math.sin(theta);
                    target = new THREE.Vector3(wx, 1, wz); // Keep y=1 for now
                    faunaTargets.set(id, target);
                }
            }

            if (target) {
                const dist = mesh.position.distanceTo(target);
                if (dist > 0.05) {
                    const step = FAUNA_SPEED * delta;
                    if (step >= dist) {
                        mesh.position.copy(target);
                    } else {
                        const direction = new THREE.Vector3().subVectors(target, mesh.position).normalize();
                        mesh.position.add(direction.multiplyScalar(step));
                    }
                }
            }
        }

        const moveDir = new THREE.Vector3(0, 0, 0);

        if (keysPressed['w'] || keysPressed['arrowup']) moveDir.z -= 1;
        if (keysPressed['s'] || keysPressed['arrowdown']) moveDir.z += 1;
        if (keysPressed['a'] || keysPressed['arrowleft']) moveDir.x -= 1;
        if (keysPressed['d'] || keysPressed['arrowright']) moveDir.x += 1;

        // Only allow movement in gamein phase
        if (gameStateProvider.phase === "gamein" && moveDir.lengthSq() > 0) {
            moveDir.normalize();
            localPosition.add(moveDir.multiplyScalar(AVATAR_SPEED * delta));

            // Camera follow logic
            camera.position.x = localPosition.x + 5; // maintain offset
            camera.position.z = localPosition.z + 20; // maintain offset
            camera.position.y = 20; // fixed height
            controls.target.set(localPosition.x, 0, localPosition.z);

            // Check if position changed significantly to send update
            if (localPosition.distanceTo(lastSentPosition) > 0.1) {
                gameStateProvider.sendAvatarPosition([localPosition.x, localPosition.z, 0]);
                lastSentPosition.copy(localPosition);
            }
        }
    }
    updateLoop();

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

            // Set initial position directly
            mesh.position.set(x, 1, z);
            faunaAnchors.set(id, new THREE.Vector3(x, 1, z));
            faunaTargets.set(id, new THREE.Vector3(x, 1, z)); // Initial target is anchor
        } else {
            // Update anchor from server
            const newAnchor = new THREE.Vector3(x, 1, z);
            const oldAnchor = faunaAnchors.get(id);

            // If anchor moved significantly (teleport), snap mesh
            if (oldAnchor && oldAnchor.distanceTo(newAnchor) > 5.0) {
                 mesh.position.copy(newAnchor);
                 faunaTargets.set(id, newAnchor);
            }
            faunaAnchors.set(id, newAnchor);
        }
    }

    // Remove fauna no longer present
    for (const [id, mesh] of faunaMeshes.entries()) {
        if (!receivedFaunaIds.has(id)) {
            scene.remove(mesh);
            faunaMeshes.delete(id);
            faunaTargets.delete(id);
            faunaAnchors.delete(id);
        }
    }
}

window.addEventListener("DOMContentLoaded", main);
