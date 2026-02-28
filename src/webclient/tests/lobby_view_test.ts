// lobby_view_test.ts
//
// Standalone Deno tests for LobbyView logic.
// Uses a minimal DOM stub so tests run without
// a real browser.
//
// Run: deno test src/webclient/tests/lobby_view_test.ts

import {
    assertEquals,
    assertExists,
} from "https://deno.land/std@0.224.0/assert/mod.ts";

// ── Minimal DOM stub ────────────────────────
// LobbyView queries five elements by ID and
// adds a global keydown listener.  We stub
// just enough to satisfy those calls.

class MockElement {
    id: string;
    children: MockElement[] = [];
    innerHTML = "";
    textContent = "";
    className = "";
    style: Record<string, string> = {};
    listeners: Record<
        string, ((e: any) => void)[]
    > = {};
    classList = {
        _set: new Set<string>(),
        add(c: string) { this._set.add(c); },
        remove(c: string) { this._set.delete(c); },
        contains(c: string) {
            return this._set.has(c);
        },
    };
    onclick: ((e?: any) => void) | null = null;

    constructor(id = "") { this.id = id; }

    appendChild(child: MockElement) {
        this.children.push(child);
    }
}

// Registry of elements by ID.
const dom: Record<string, MockElement> = {};

function resetDom() {
    for (const key of Object.keys(dom)) {
        delete dom[key];
    }
    const ids = [
        "lobby-view",
        "sector-selection",
        "sector-list-container",
        "lobby-queue",
        "player-list-container",
    ];
    for (const id of ids) {
        dom[id] = new MockElement(id);
    }
}

// Track global keydown listeners so we can
// dispatch synthetic events in tests.
let keydownListeners: ((e: any) => void)[] = [];

function resetListeners() {
    keydownListeners = [];
}

// Inject globals before importing LobbyView.
(globalThis as any).document = {
    getElementById(id: string) {
        return dom[id] || null;
    },
    createElement(_tag: string) {
        return new MockElement();
    },
    body: {
        appendChild() { },
    },
};

(globalThis as any).window = {
    ...(globalThis as any).window || {},
    addEventListener(
        event: string,
        fn: (e: any) => void,
    ) {
        if (event === "keydown") {
            keydownListeners.push(fn);
        }
    },
    removeEventListener() { },
};

// ── Import after globals ────────────────────
const { LobbyView } = await import(
    "../LobbyView.ts"
);

// Helper to dispatch key event to all
// registered keydown listeners.
function pressKey(key: string) {
    for (const fn of keydownListeners) {
        fn({ key, preventDefault() { } });
    }
}

// ── Tests ───────────────────────────────────

Deno.test(
    "LobbyView: constructor finds DOM " +
    "elements",
    () => {
        resetDom();
        resetListeners();
        const lv = new LobbyView();
        assertExists(lv);
    },
);

Deno.test(
    "LobbyView: renderSectorList populates " +
    "container",
    () => {
        resetDom();
        resetListeners();
        const lv = new LobbyView();

        const sectors = [
            { id: "s1", name: "Alpha" },
            { id: "s2", name: "Beta" },
        ];
        lv.renderSectorList(sectors);

        const container = dom[
            "sector-list-container"
        ];
        assertEquals(
            container.children.length, 2,
        );
    },
);

Deno.test(
    "LobbyView: show/hide toggles class",
    () => {
        resetDom();
        resetListeners();
        const lv = new LobbyView();

        lv.hide();
        assertEquals(
            dom["lobby-view"].classList
                .contains("hidden"),
            true,
        );

        lv.show();
        assertEquals(
            dom["lobby-view"].classList
                .contains("hidden"),
            false,
        );
    },
);

Deno.test(
    "LobbyView: onSectorSelect callback " +
    "fires on click",
    () => {
        resetDom();
        resetListeners();
        const lv = new LobbyView();

        const sectors = [
            { id: "s1", name: "Alpha" },
            { id: "s2", name: "Beta" },
        ];
        lv.renderSectorList(sectors);

        let selected: any = null;
        lv.onSectorSelect(
            (s: any) => { selected = s; },
        );

        // Simulate click on second sector.
        const item = dom[
            "sector-list-container"
        ].children[1];
        assertExists(item.onclick);
        item.onclick!();

        assertExists(selected);
        assertEquals(selected.id, "s2");
        assertEquals(selected.name, "Beta");
    },
);

Deno.test(
    "LobbyView: keyboard navigation cycles " +
    "selection",
    () => {
        resetDom();
        resetListeners();
        const lv = new LobbyView();

        const sectors = [
            { id: "s1", name: "A" },
            { id: "s2", name: "B" },
            { id: "s3", name: "C" },
        ];
        lv.renderSectorList(sectors);
        lv.show();

        // Initial selection is index 0.
        // Press ArrowDown → index 1
        pressKey("ArrowDown");
        // ArrowDown again → index 2
        pressKey("ArrowDown");

        // Now Enter should select "C"
        let selected: any = null;
        lv.onSectorSelect(
            (s: any) => { selected = s; },
        );
        pressKey("Enter");
        assertExists(selected);
        assertEquals(selected.id, "s3");
    },
);

Deno.test(
    "LobbyView: updatePlayerQueue switches " +
    "to queue view",
    () => {
        resetDom();
        resetListeners();
        const lv = new LobbyView();

        lv.updatePlayerQueue([
            ["p1", 0, 0, 0],
            ["p2", 1, 0, 1],
        ]);

        const playerList = dom[
            "player-list-container"
        ];
        assertEquals(
            playerList.children.length, 2,
        );
        assertEquals(
            dom["sector-selection"].style.display,
            "none",
        );
        assertEquals(
            dom["lobby-queue"].style.display,
            "block",
        );
    },
);
