import { Application } from "./deps.ts";

// Example function to initialize the game UI
function initGameUI() {
  const appElement = document.getElementById("app");
  if (appElement) {
    appElement.innerHTML = "<h1>Welcome to the Game!</h1>";
  }
}

// Initialize the game UI when the page loads
window.addEventListener("load", initGameUI);