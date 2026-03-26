export class ActionHUD {
    private container: HTMLElement;
    private charmValueEl: HTMLElement | null = null;
    private onCharmClick?: () => void;
    private onPickUpClick?: (itemId: string) => void;
    private onDropClick?: (itemId: string) => void;
    private nearbyItem: { id: string, name: string } | null = null;
    private hoveredItem: { id: string, name: string } | null = null;
    private inventory: string[] = [];
    private dragTarget: { id: string, startY: number, el: HTMLElement } | null = null;

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
        const val = level.toString();
        if (this.charmValueEl && (this.charmValueEl.innerText === val || this.charmValueEl.textContent === val)) return;
        if (this.charmValueEl) {
            this.charmValueEl.innerText = val;
            this.charmValueEl.textContent = val;
        }
    }

    public setNearbyItem(item: { id: string, name: string } | null) {
        if (JSON.stringify(this.nearbyItem) === JSON.stringify(item)) return;
        this.nearbyItem = item;
        this.render();
    }

    public setHoveredItem(item: { id: string, name: string } | null) {
        if (JSON.stringify(this.hoveredItem) === JSON.stringify(item)) return;
        this.hoveredItem = item;
        this.render();
    }

    public setOnPickUpClick(cb: (itemId: string) => void) {
        this.onPickUpClick = cb;
    }

    public setOnDropClick(cb: (itemId: string) => void) {
        this.onDropClick = cb;
    }

    public setInventory(items: string[]) {
        if (JSON.stringify(this.inventory) === JSON.stringify(items)) return;
        this.inventory = items;
        this.render();
    }

    public show() {
        this.render();
    }

    public hide() {
        this.container.innerHTML = "";
    }

    private render() {
        this.container.innerHTML = `
            <div class="action-card" id="hud-charm-card">
                <div class="card-title">CHARM</div>
                <div class="card-value">0</div>
            </div>
            ${this.nearbyItem ? `
            <div class="action-card" id="hud-pickup-card" style="margin-left: 10px; border-color: #ffd700;">
                <div class="card-title">PICK UP</div>
                <div class="card-value">${this.nearbyItem.name}</div>
            </div>
            ` : ""}
            ${(this.hoveredItem && (!this.nearbyItem || this.hoveredItem.id !== this.nearbyItem.id)) ? `
            <div class="action-card ghost" id="hud-hover-card">
                <div class="card-title">PICK UP</div>
                <div class="card-value">${this.hoveredItem.name}</div>
            </div>
            ` : ""}
            ${this.inventory.map((itemId, i) => `
            <div class="action-card hud-inventory-card" data-id="${itemId}" style="margin-left: 10px; border-color: #00ff00;">
                <div class="card-title">ITEM</div>
                <div class="card-value">${itemId.replace("item_", "")}</div>
            </div>
            `).join("")}
        `;

        this.charmValueEl = this.container.querySelector("#hud-charm-card .card-value");
        const charmCard = this.container.querySelector("#hud-charm-card");
        const pickupCard = this.container.querySelector("#hud-pickup-card");
        const inventoryCards = this.container.querySelectorAll(".hud-inventory-card");

        charmCard?.addEventListener("click", () => {
            if (this.onCharmClick) this.onCharmClick();
        });

        pickupCard?.addEventListener("click", () => {
            if (this.onPickUpClick && this.nearbyItem) {
                this.onPickUpClick(this.nearbyItem.id);
            }
        });

        inventoryCards.forEach((card) => {
            const el = card as HTMLElement;
            const itemId = el.getAttribute("data-id")!;
            
            el.addEventListener("mousedown", (e) => {
                this.dragTarget = { id: itemId, startY: e.clientY, el };
                el.style.transition = "none";
                el.style.zIndex = "1000";
            });
        });

        const win = (globalThis as any).window || globalThis;
        if (!win.hasGlobalHudListeners) {
            win.addEventListener("mousemove", (e: MouseEvent) => {
                if (!this.dragTarget) return;
                const dy = e.clientY - this.dragTarget.startY;
                if (dy < 0) {
                    this.dragTarget.el.style.transform = `translateY(${dy}px)`;
                }
            });

            win.addEventListener("mouseup", (e: MouseEvent) => {
                if (!this.dragTarget) return;
                const dy = e.clientY - this.dragTarget.startY;
                const cardHeight = this.dragTarget.el.offsetHeight || 64;
                
                if (dy < -2 * cardHeight) {
                    if (this.onDropClick) this.onDropClick(this.dragTarget.id);
                }
                
                this.dragTarget.el.style.transition = "transform 0.2s ease-out";
                this.dragTarget.el.style.transform = "translateY(0)";
                this.dragTarget.el.style.zIndex = "";
                this.dragTarget = null;
            });
            win.hasGlobalHudListeners = true;
        }
    }
}
