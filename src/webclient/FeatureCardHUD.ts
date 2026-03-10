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
        this.container.innerHTML = `
            <div class="feature-card" id="hud-charm-card">
                <div class="card-title">CHARM</div>
                <div class="card-value">0</div>
            </div>
        `;

        this.charmValueEl = this.container.querySelector(".card-value");
        const card = this.container.querySelector("#hud-charm-card");

        card?.addEventListener("click", () => {
            if (this.onCharmClick) this.onCharmClick();
        });
    }
}
