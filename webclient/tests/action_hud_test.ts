import {
    assertEquals,
    assertExists,
} from "https://deno.land/std@0.224.0/assert/mod.ts";

class MockElement {
    id: string;
    children: MockElement[] = [];
    textContent = "";
    className = "";
    style: Record<string, string> = {};

    onclick: ((e?: any) => void) | null = null;
    listeners: Record<string, ((e: any) => void)[]> = {};

    constructor(id = "") {
        this.id = id;
    }

    appendChild(child: MockElement) {
        this.children.push(child);
    }

    querySelector(selector: string): MockElement | null {
        if (selector === ".card-value") {
           return this.children.find(c => c.className === "card-value") || null;
        }
        const parts = selector.trim().split(/\s+/);
        let current: MockElement | null = this;
        for (const part of parts) {
            if (!current) return null;
            const found = current.querySelectorAll(part);
            if (found.length === 0) return null;
            current = found[0];
        }
        return current;
    }

    querySelectorAll(selector: string): MockElement[] {
        const results: MockElement[] = [];
        if (selector.startsWith(".")) {
            const cls = selector.substring(1);
            if (this.className && this.className.includes(cls)) {
                results.push(this);
            }
        } else if (selector.startsWith("#")) {
            const targetId = selector.substring(1);
            if (this.id === targetId) {
                results.push(this);
            }
        }
        for (const child of this.children) {
            results.push(...child.querySelectorAll(selector));
        }
        return results;
    }

    getAttribute(_name: string): string | null {
        return "";
    }

    setAttribute(name: string, value: string) {
        if (name === "style") {
            const parts = value.split(";");
            parts.forEach(p => {
                const [k, v] = p.split(":").map(s => s.trim());
                if (k && v) this.style[k] = v;
            });
        }
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

(globalThis as any).window = globalThis;
(globalThis as any).document = {
    getElementById(id: string) {
        return dom[id] || null;
    },
    createElement(tag: string) {
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
    assertEquals(card.children[0].textContent, "CHARM");
    assertEquals(card.children[1].className, "card-value");
});

Deno.test("ActionHUD: setCharmLevel updates the dom node", () => {
    resetDom();
    const hud = new ActionHUD();
    hud.show();

    hud.setCharmLevel(42);
    const overlay = dom["hud-overlay"];
    const card = overlay.children[0];
    const cardValue = card.querySelector(".card-value");
    assertExists(cardValue);
    assertEquals(cardValue!.textContent, "42");
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
