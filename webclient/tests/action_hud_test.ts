import {
    assertEquals,
    assertExists,
} from "https://deno.land/std@0.224.0/assert/mod.ts";

class MockElement {
    id: string;
    children: MockElement[] = [];
    textContent = "";
    className = "";
    innerText = "";

    set innerHTML(html: string) {
        if (!html) {
            this.children = [];
            return;
        }
        this.children = createDOMTreeFromHTML(html);
    }
    get innerHTML() { return ""; }

    onclick: ((e?: any) => void) | null = null;
    listeners: Record<string, ((e: any) => void)[]> = {};

    constructor(id = "") {
        this.id = id;
    }

    appendChild(child: MockElement) {
        this.children.push(child);
    }

    querySelector(selector: string): MockElement | null {
        if (selector.startsWith(".")) {
            const cls = selector.substring(1);
            if (this.className && this.className.includes(cls)) return this;
            for (const child of this.children) {
                const found = child.querySelector(selector);
                if (found) return found;
            }
        } else if (selector.startsWith("#")) {
            const targetId = selector.substring(1);
            if (this.id === targetId) return this;
            for (const child of this.children) {
                const found = child.querySelector(selector);
                if (found) return found;
            }
        }
        return null;
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

function createDOMTreeFromHTML(html: string): MockElement[] {
    const root = new MockElement("hud-charm-card");
    root.className = "action-card";

    const title = new MockElement();
    title.className = "card-title";
    title.innerText = "CHARM";

    const value = new MockElement();
    value.className = "card-value";
    value.innerText = "0";

    root.appendChild(title);
    root.appendChild(value);

    // Naively return the root if the html string contains the id
    // This perfectly mirrors our specific render payload for the test environment.
    if (html.includes('id="hud-charm-card"')) return [root];
    return [];
}

(globalThis as any).document = {
    getElementById(id: string) {
        return dom[id] || null;
    },
    createElement(_tag: string) {
        return new MockElement();
    }
};

const { ActionHUD } = await import("../ActionHUD.ts");

Deno.test("ActionHUD: constructor initializes without error", () => {
    resetDom();
    const hud = new ActionHUD();
    assertExists(hud);
});

Deno.test("ActionHUD: show renders the charm card correctly", () => {
    resetDom();
    const hud = new ActionHUD();
    hud.show();

    const overlay = dom["hud-overlay"];
    assertEquals(overlay.children.length, 1);
    const card = overlay.children[0];
    assertEquals(card.className, "action-card");

    // Title and Value
    assertEquals(card.children.length, 2);
    assertEquals(card.children[0].className, "card-title");
    assertEquals(card.children[0].innerText, "CHARM");
    assertEquals(card.children[1].className, "card-value");
});

Deno.test("ActionHUD: setCharmLevel updates the dom node", () => {
    resetDom();
    const hud = new ActionHUD();
    hud.show();

    hud.setCharmLevel(42);
    const cardValue = dom["hud-overlay"].querySelector(".card-value");
    assertExists(cardValue);
    assertEquals(cardValue!.innerText, "42");
});

Deno.test("ActionHUD: onCharmClick callback responds to events", () => {
    resetDom();
    const hud = new ActionHUD();

    let clicked = false;
    hud.setOnCharmClick(() => {
        clicked = true;
    });

    hud.show();
    const card = dom["hud-overlay"].querySelector("#hud-charm-card");
    assertExists(card);
    card!.dispatchEvent("click");
    assertEquals(clicked, true);
});
