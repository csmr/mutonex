import { ViewManager } from "./ViewManager.ts";
import { GlobeView } from "./GlobeView.ts";
import { GameStateProvider } from "./GameStateProvider.ts";

async function main() {
  const canvas = document.getElementById('main-canvas') as HTMLCanvasElement;
  if (!canvas) {
    console.error('Main canvas not found');
    return;
  }

  // Fetch the geographical data
  const geoDataResponse = await fetch('./assets/countries.topo.json');
  const geoData = await geoDataResponse.json();

  // Setup the main components
  const viewManager = new ViewManager(canvas);
  const globeView = new GlobeView(geoData, canvas);
  viewManager.setActiveView(globeView);

  // Setup the game state provider
  const gameStateProvider = new GameStateProvider((gameState) => {
    globeView.updateGameState(gameState);
  });
  gameStateProvider.start();

  // Wire up the "Next Turn" button
  const nextTurnBtn = document.getElementById("next-turn-btn");
  if (nextTurnBtn) {
    nextTurnBtn.addEventListener("click", () => {
      gameStateProvider.requestNewGameState();
    });
  }
}

window.addEventListener("DOMContentLoaded", main);
