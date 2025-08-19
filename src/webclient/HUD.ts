import { GameState } from "./MockGameStateProvider.ts";

/**
 * Manages the Heads-Up Display (HUD) elements.
 */
export class HUD {
    private container: HTMLDivElement;
    private timerElement: HTMLDivElement;
    private resourcesElement: HTMLDivElement;

    constructor() {
        this.container = document.createElement('div');
        this.container.style.position = 'absolute';
        this.container.style.top = '0';
        this.container.style.left = '0';
        this.container.style.width = '100%';
        this.container.style.padding = '10px';
        this.container.style.color = '#ff6600'; // Orange
        this.container.style.fontFamily = 'monospace';
        this.container.style.fontSize = '16px';
        this.container.style.pointerEvents = 'none'; // Clicks go through to the canvas
        this.container.style.boxSizing = 'border-box';

        this.timerElement = document.createElement('div');
        this.timerElement.style.position = 'absolute';
        this.timerElement.style.top = '10px';
        this.timerElement.style.left = '10px';

        this.resourcesElement = document.createElement('div');
        this.resourcesElement.style.position = 'absolute';
        this.resourcesElement.style.top = '10px';
        this.resourcesElement.style.right = '10px';
        this.resourcesElement.style.textAlign = 'right';

        this.container.appendChild(this.timerElement);
        this.container.appendChild(this.resourcesElement);
        document.body.appendChild(this.container);
    }

    public update(state: GameState): void {
        // Format time as MM:SS
        const minutes = Math.floor(state.gameTime / 60);
        const seconds = state.gameTime % 60;
        this.timerElement.innerText = `Time: ${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

        // Display Player1's resources for this demo
        const p1Resources = state.resources['Player1'];
        this.resourcesElement.innerText = `Energy: ${p1Resources.energy}\nMaterials: ${p1Resources.materials}`;
    }
}
