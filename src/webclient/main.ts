import { Application } from "./deps.ts";
import { API_KEY_HASH } from './api-key-hash.ts';

// Example function to initialize the game UI
function initGameUI() {
    const appElement = document.getElementById("app");
    if (appElement) {
        appElement.innerHTML = "<h1>Welcome to the Game!</h1>";
        console.log(`Client key hash: ${API_KEY_HASH}`);
    }
}

// Initialize the game UI when the page loads
window.addEventListener("load", initGameUI);
