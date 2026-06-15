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
        if (this.charmValueEl && this.charmValueEl.textContent === val) return;
        if (this.charmValueEl) {
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
        this.container.textContent = "";
    }

    private createCard(id: string, title: string, value: string, extraClasses: string = "", extraStyle: string = "") {
        const card = document.createElement("div");
        card.className = `action-card ${extraClasses}`.trim();
        card.id = id;
        if (extraStyle) card.setAttribute("style", extraStyle);

        const titleEl = document.createElement("div");
        titleEl.className = "card-title";
        titleEl.textContent = title;

        const valueEl = document.createElement("div");
        valueEl.className = "card-value";
        valueEl.textContent = value;

        card.appendChild(titleEl);
        card.appendChild(valueEl);
        return card;
    }

    private render() {
        this.container.textContent = "";

        // Charm Card
        const charmCard = this.createCard("hud-charm-card", "CHARM", "0");
        this.charmValueEl = charmCard.querySelector(".card-value") as HTMLElement;
        charmCard.addEventListener("click", () => {
            if (this.onCharmClick) this.onCharmClick();
        });
        this.container.appendChild(charmCard);

        // Nearby Item Card
        if (this.nearbyItem) {
            const pickupCard = this.createCard("hud-pickup-card", "PICK UP", this.nearbyItem.name, "", "margin-left: 10px; border-color: #ffd700;");
            pickupCard.addEventListener("click", () => {
                if (this.onPickUpClick && this.nearbyItem) {
                    this.onPickUpClick(this.nearbyItem.id);
                }
            });
            this.container.appendChild(pickupCard);
        }

        // Hovered Item Card
        if (this.hoveredItem && (!this.nearbyItem || this.hoveredItem.id !== this.nearbyItem.id)) {
            const hoverCard = this.createCard("hud-hover-card", "PICK UP", this.hoveredItem.name, "ghost");
            this.container.appendChild(hoverCard);
        }

        // Inventory Cards
        this.inventory.forEach((itemId) => {
            const card = this.createCard("", "ITEM", itemId.replace("item_", ""), "hud-inventory-card", "margin-left: 10px; border-color: #00ff00;");
            card.setAttribute("data-id", itemId);
            
            card.addEventListener("mousedown", (e) => {
                const el = card as HTMLElement;
                this.dragTarget = { id: itemId, startY: e.clientY, el };
                el.style.transition = "none";
                el.style.zIndex = "1000";
            });
            this.container.appendChild(card);
        });

        if (!(window as any).hasGlobalHudListeners) {
            window.addEventListener("mousemove", (e) => {
                if (!this.dragTarget) return;
                const dy = e.clientY - this.dragTarget.startY;
                if (dy < 0) {
                    this.dragTarget.el.style.transform = `translateY(${dy}px)`;
                }
            });

            window.addEventListener("mouseup", (e) => {
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
            (window as any).hasGlobalHudListeners = true;
        }
    }
}
