import { ViewManager } from "./ViewManager.ts";
import { GlobeView } from "./GlobeView.ts";
import { LidarView } from "./LidarView.ts";
import { GameStateProvider } from "./GameStateProvider.ts";

async function main() {
  const canvas = document.getElementById('main-canvas') as HTMLCanvasElement;
  if (!canvas) {
    console.error('Main canvas not found');
    return;
  }

  // Fetch the geographical data for the GlobeView
  const geoDataResponse = await fetch('./assets/countries.topo.json');
  const geoData = await geoDataResponse.json();

  // Setup the main components
  const viewManager = new ViewManager(canvas);
  const globeView = new GlobeView(geoData, canvas);
  const lidarView = new LidarView(canvas);

  // Set the initial view
  viewManager.setActiveView(lidarView);

  // Setup the game state provider, handling connection errors gracefully
  try {
    const gameStateProvider = new GameStateProvider((gameState) => {
      // This callback is only used by GlobeView.
      if (viewManager.getActiveView() === globeView) {
        globeView.updateGameState(gameState);
      }
    });
    gameStateProvider.start();

    // Wire up the "Next Turn" button only if the connection is successful
    const nextTurnBtn = document.getElementById("next-turn-btn");
    if (nextTurnBtn) {
      nextTurnBtn.addEventListener("click", () => {
        // Only request new state if the GlobeView is active
        if (viewManager.getActiveView() === globeView) {
          gameStateProvider.requestNewGameState();
        }
      });
    }
  } catch (error) {
    console.error("Could not connect to game server:", error);
    // Hide the "Next Turn" button if the connection fails
    const nextTurnBtn = document.getElementById("next-turn-btn");
    if (nextTurnBtn) {
      nextTurnBtn.style.display = "none";
    }
  }

  // Wire up the "Toggle View" button
  const toggleViewBtn = document.getElementById("toggle-view-btn");
  if (toggleViewBtn) {
    toggleViewBtn.addEventListener("click", () => {
      if (viewManager.getActiveView() === globeView) {
        viewManager.setActiveView(lidarView);
      } else {
        viewManager.setActiveView(globeView);
      }
    });
  }
}

window.addEventListener("DOMContentLoaded", main);
