import {
    assertEquals,
    assertExists,
} from "https://deno.land/std@0.224.0/assert/mod.ts";

class MockElement {
    id: string;
    children: MockElement[] = [];
    innerHTML = "";
    textContent = "";
    className = "";
    innerText = "";
    onclick: ((e?: any) => void) | null = null;
    listeners: Record<string, ((e: any) => void)[]> = {};

    constructor(id = "") {
        this.id = id;
    }

    appendChild(child: MockElement) {
        this.children.push(child);
    }

    addEventListener(event: string, fn: (e: any) => void) {
        if (!this.listeners[event]) this.listeners[event] = [];
        this.listeners[event].push(fn);
    }

    dispatchEvent(event: string) {
        if (this.listeners[event]) {
            for (const fn of this.listeners[event]) {
                fn({ type: event });
            }
        }
    }
}

const dom: Record<string, MockElement> = {};

function resetDom() {
    for (const key of Object.keys(dom)) {
        delete dom[key];
    }
    dom["hud-overlay"] = new MockElement("hud-overlay");
}

(globalThis as any).document = {
    getElementById(id: string) {
        return dom[id] || null;
    },
    createElement(_tag: string) {
        return new MockElement();
    },
};

const { FeatureCardHUD } = await import("../FeatureCardHUD.ts");

Deno.test("FeatureCardHUD: constructor initializes without error", () => {
    resetDom();
    const hud = new FeatureCardHUD();
    assertExists(hud);
});

Deno.test("FeatureCardHUD: show renders the charm card correctly", () => {
    resetDom();
    const hud = new FeatureCardHUD();
    hud.show();

    const overlay = dom["hud-overlay"];
    assertEquals(overlay.children.length, 1);
    const card = overlay.children[0];
    assertEquals(card.className, "feature-card");

    // Title and Value
    assertEquals(card.children.length, 2);
    assertEquals(card.children[0].className, "card-title");
    assertEquals(card.children[0].innerText, "CHARM");
    assertEquals(card.children[1].className, "card-value");
});

Deno.test("FeatureCardHUD: setCharmLevel updates the dom node", () => {
    resetDom();
    const hud = new FeatureCardHUD();
    hud.show();

    hud.setCharmLevel(42);
    const cardValue = dom["hud-overlay"].children[0].children[1];
    assertEquals(cardValue.innerText, "42");
});

Deno.test("FeatureCardHUD: onCharmClick callback responds to events", () => {
    resetDom();
    const hud = new FeatureCardHUD();

    let clicked = false;
    hud.setOnCharmClick(() => {
        clicked = true;
    });

    hud.show();
    const card = dom["hud-overlay"].children[0];
    card.dispatchEvent("click");
    assertEquals(clicked, true);
});
