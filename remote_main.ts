// Declare THREE as a global variable to access it from the <script> tag
// declare const THREE: any; // Now in global_types.ts
import "./global_types.ts";

import { GameStateProvider } from "./GameStateProvider.ts";
import { ViewManager } from "./ViewManager.ts";
import { LidarView } from "./LidarView.ts";
import { SphereView } from "./SphereView.ts";
import { EntityType, EntityData, Terrain } from "./types.ts";
import type { PlayerTuple } from './MockGameStateProvider.ts';

// Main application logic
function main() {
  const canvas = document.getElementById('main-canvas') as HTMLCanvasElement;
  if (!canvas) {
    console.error('Main canvas not found');
    return;
  }

  // --- View Manager Setup ---
  const viewManager = new ViewManager(canvas);

  // --- Views ---
  const lidarView = new LidarView(canvas);
  const sphereView = new SphereView(canvas);

  viewManager.setActiveView(lidarView); // Default to Lidar

  // Start the render loop
  viewManager.animate();

  // --- GameStateProvider Setup ---
  // Data State
  const entities: EntityData[] = [];
  const playerAnchors: Map<string, any> = new Map();
  const faunaAnchors: Map<string, any> = new Map();
  // Interpolation state
  const faunaTargets: Map<string, any> = new Map();

  // We keep track of local player to handle input
  const localPlayerPos = new THREE.Vector3(10, 0, 10);
  let lastSentPosition = localPlayerPos.clone();
  let currentTerrain: Terrain | null = null;
  let lidarMode: 'vertical' | 'horizontal' = 'vertical';

  const updateEntitiesList = (interpolatedPositions?: Map<string, any>) => {
    entities.length = 0;

    // Add Players
    for (const [id, pos] of playerAnchors) {
      entities.push({ id, type: 'player', pos: pos.clone(), char: '' });
    }

    // Add Fauna (Interpolated if available, else anchor)
    for (const [id, anchorPos] of faunaAnchors) {
        const pos = interpolatedPositions?.get(id) || anchorPos;
        entities.push({ id, type: 'fauna', pos: pos.clone(), char: '' });
    }

    // Update active view
    const activeView = viewManager.getActiveView();
    if (activeView) {
        activeView.updateEntities(entities);
    }
  };

  const onInitialState = (gameState: any) => {
    // 1. Terrain
    if (gameState.terrain) {
        currentTerrain = gameState.terrain;
        if (currentTerrain) {
            lidarView.updateTerrain(currentTerrain);
            sphereView.updateTerrain(currentTerrain);
        }
    }

    // 2. Initial Entities
    if (gameState.players) updatePlayerAnchors(gameState.players);
    if (gameState.fauna) updateFaunaAnchors(gameState.fauna);
    updateEntitiesList();
  };

  const onStateUpdate = (update: { players?: PlayerTuple[], fauna?: PlayerTuple[] }) => {
    if (update.players) updatePlayerAnchors(update.players);
    if (update.fauna) updateFaunaAnchors(update.fauna);
    // Don't force update here, let the loop handle it with interpolation
  };

  try {
    const gameStateProvider = new GameStateProvider(onInitialState, onStateUpdate);
    gameStateProvider.start();

    // --- Avatar Controls & Loop ---
    const keysPressed: { [key: string]: boolean } = {};
    const AVATAR_SPEED = 20.0;
    const FAUNA_SPEED = 0.5;
    let lastTime = performance.now();

    window.addEventListener('keydown', (e) => {
        keysPressed[e.key.toLowerCase()] = true;

        // Toggle View
        if (e.key === 'Tab') {
            e.preventDefault();
            const current = viewManager.getActiveView();
            const next = current === lidarView ? sphereView : lidarView;
            viewManager.setActiveView(next);
            // Sync terrain/entities immediately
            if (currentTerrain) next.updateTerrain(currentTerrain);
            updateEntitiesList();
        }

        // Toggle Lidar Mode
        if (e.key.toLowerCase() === 'l') {
             lidarMode = lidarMode === 'vertical' ? 'horizontal' : 'vertical';
             lidarView.setScanMode(lidarMode);
             console.log("Lidar Mode:", lidarMode);
        }
    });

    window.addEventListener('keyup', (e) => {
        keysPressed[e.key.toLowerCase()] = false;
    });

    function updateLoop() {
        requestAnimationFrame(updateLoop);

        const now = performance.now();
        const delta = (now - lastTime) / 1000;
        lastTime = now;

        // --- Fauna Interpolation ---
        const currentInterp = new Map<string, any>();

        for (const [id, anchor] of faunaAnchors) {
            let target = faunaTargets.get(id);
            // If no target or reached target, pick new wander point around anchor
            // We store current simulated position in the target map for simplicity or track separately
            // Actually, let's track simulated pos separately?
            // For PoC, let's just assume we interpolate FROM anchor TO wander target.
            // But anchor changes.
            // Let's implement simple wandering:

            // If we don't have a 'simulated' position, start at anchor
            if (!target) {
                target = anchor.clone();
                faunaTargets.set(id, target);
            }

            // Move target towards a wander point?
            // Reuse logic: target is the current position. We move it.
            // If it is far from anchor, move back.

            const dist = target.distanceTo(anchor);
            if (dist > 5.0) {
                 // Too far, move back to anchor
                 const dir = new THREE.Vector3().subVectors(anchor, target).normalize();
                 target.add(dir.multiplyScalar(FAUNA_SPEED * delta));
            } else {
                 // Wander randomly
                 // Simple random walk
                 const theta = (Math.random() - 0.5) * 2.0; // randomness
                 // We need persistent direction for smooth wandering.
                 // For now, just jitter.
                 target.x += (Math.random() - 0.5) * FAUNA_SPEED * delta * 2;
                 target.z += (Math.random() - 0.5) * FAUNA_SPEED * delta * 2;
            }

            currentInterp.set(id, target);
        }


        // --- Player Movement ---
        const moveDir = new THREE.Vector3(0, 0, 0);
        if (keysPressed['w'] || keysPressed['arrowup']) moveDir.z -= 1;
        if (keysPressed['s'] || keysPressed['arrowdown']) moveDir.z += 1;
        if (keysPressed['a'] || keysPressed['arrowleft']) moveDir.x -= 1;
        if (keysPressed['d'] || keysPressed['arrowright']) moveDir.x += 1;

        if (gameStateProvider.phase === "gamein" && moveDir.lengthSq() > 0) {
            moveDir.normalize();
            const moveVec = moveDir.multiplyScalar(AVATAR_SPEED * delta);

            // Update active view controls target/camera
            const activeView = viewManager.getActiveView();
            if (activeView) {
                activeView.camera.position.add(moveVec);
                if (activeView.controls && activeView.controls.target) {
                     activeView.controls.target.add(moveVec);
                }
            }

            localPlayerPos.add(moveVec);

            if (localPlayerPos.distanceTo(lastSentPosition) > 1.0) {
                gameStateProvider.sendAvatarPosition([localPlayerPos.x, localPlayerPos.z, 0]);
                lastSentPosition.copy(localPlayerPos);
            }
        }

        // Push updates to view
        updateEntitiesList(currentInterp);
    }
    updateLoop();

  } catch (error) {
    console.error("Could not connect to game server:", error);
  }

  function updatePlayerAnchors(players: PlayerTuple[]) {
      for (const [id, x, y, z] of players) {
          playerAnchors.set(id, new THREE.Vector3(x, 1, z));
      }
  }

  function updateFaunaAnchors(fauna: PlayerTuple[]) {
      for (const [id, x, y, z] of fauna) {
          faunaAnchors.set(id, new THREE.Vector3(x, 1, z));
      }
  }
}

window.addEventListener("DOMContentLoaded", main);
