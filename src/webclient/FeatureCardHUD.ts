export class FeatureCardHUD {
    private container: HTMLElement;
    private charmValueEl: HTMLElement | null = null;
    private onCharmClick?: () => void;

    constructor() {
        this.container = document.getElementById("hud-overlay") as HTMLElement;
        if (!this.container) {
            console.error("Missing #hud-overlay element");
            return;
        }
    }

    public setOnCharmClick(cb: () => void) {
        this.onCharmClick = cb;
    }

    public setCharmLevel(level: number) {
        if (this.charmValueEl) {
            this.charmValueEl.innerText = level.toString();
        }
    }

    public show() {
        this.render();
    }

    public hide() {
        this.container.innerHTML = "";
    }

    private render() {
        this.container.innerHTML = "";

        const card = document.createElement("div");
        card.className = "feature-card";

        const title = document.createElement("div");
        title.className = "card-title";
        title.innerText = "CHARM";

        const value = document.createElement("div");
        value.className = "card-value";
        value.innerText = "0";
        this.charmValueEl = value;

        card.appendChild(title);
        card.appendChild(value);

        card.addEventListener("click", () => {
            if (this.onCharmClick) this.onCharmClick();
        });

        this.container.appendChild(card);
    }
}
