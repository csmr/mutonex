// webclient/tests/shortcut_engine_test.ts
import {
    assertEquals
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import * as Engine from "../ShortcutEngine.ts";

// Minimal DOM stub for ShortcutEngine
(globalThis as any).document = {
    activeElement: null,
};

let eventListeners: Record<string, ((e: any) => void)[]> = {};
(globalThis as any).window = {
    addEventListener(type: string, listener: (e: any) => void) {
        if (!eventListeners[type]) eventListeners[type] = [];
        eventListeners[type].push(listener);
    },
    removeEventListener(type: string, listener: (e: any) => void) {
        eventListeners[type] = eventListeners[type]?.filter(
            l => l !== listener
        );
    }
};

function dispatch(type: string, event: any) {
    eventListeners[type]?.forEach(l => l(event));
}

Deno.test(
    "ShortcutEngine: normalizeKey produces consistent strings",
    () => {
        assertEquals(Engine.normalizeKey("w"), "w");
        assertEquals(Engine.normalizeKey("W"), "w");
        assertEquals(Engine.normalizeKey("ArrowUp"), "ArrowUp");
        assertEquals(
            Engine.normalizeKey("w", { shift: true }),
            "Shift+w"
        );
        assertEquals(
            Engine.normalizeKey("s", { ctrl: true, alt: true }),
            "Ctrl+Alt+s"
        );
    }
);

Deno.test(
    "ShortcutEngine: cooldown suppresses rapid discrete actions",
    async () => {
        // Wait for any prior test's cooldown to clear
        await new Promise(r => setTimeout(r, 300));
        dispatch("blur", {});

        eventListeners = {};
        let callCount = 0;
        const handlers = new Map().set("toggle_view", () => {
            callCount++;
        });

        const controller = Engine.activateContext("game", handlers);

        const ev = {
            key: "p",
            type: "keydown",
            preventDefault() {},
            shiftKey: false, ctrlKey: false,
            altKey: false, metaKey: false
        };

        dispatch("keydown", ev);
        assertEquals(callCount, 1, "First press should trigger");

        // Keyup is needed to physically release the key
        dispatch("keyup", { ...ev, type: "keyup" });

        // Rapid second press (within cooldown) should be ignored
        dispatch("keydown", ev);
        assertEquals(callCount, 1, "Rapid press suppressed");

        // Wait for cooldown
        await new Promise(r => setTimeout(r, 300));

        dispatch("keydown", ev);
        assertEquals(callCount, 2, "Press after cooldown triggers");

        controller.abort();
    }
);

Deno.test(
    "ShortcutEngine: ignores keydown repeats without keyup",
    async () => {
        // Wait for any prior test's cooldown to clear
        await new Promise(r => setTimeout(r, 300));
        dispatch("blur", {});

        eventListeners = {};
        let callCount = 0;
        const handlers = new Map().set("toggle_view", () => {
            callCount++;
        });

        const controller = Engine.activateContext("game", handlers);

        const ev = {
            key: "p",
            type: "keydown",
            preventDefault() {},
            shiftKey: false, ctrlKey: false,
            altKey: false, metaKey: false
        };

        dispatch("keydown", ev);
        assertEquals(callCount, 1);

        // Wait for cooldown
        await new Promise(r => setTimeout(r, 300));

        // Even after cooldown, without keyup, keydown repeat is ignored
        dispatch("keydown", ev);
        assertEquals(callCount, 1, "Ignored repeat without keyup");

        // Now dispatch keyup
        dispatch("keyup", { ...ev, type: "keyup" });

        // Pressing again after keyup should trigger
        dispatch("keydown", ev);
        assertEquals(callCount, 2, "Press after keyup triggers");

        controller.abort();
    }
);

Deno.test("ShortcutEngine: keyup only triggers for hold actions", () => {
    dispatch("blur", {});
    eventListeners = {};
    let toggleCount = 0;
    let moveCount = 0;

    const handlers = new Map()
        .set("toggle_view", () => {
            toggleCount++;
        })
        .set("move_fwd", () => {
            moveCount++;
        });

    Engine.activateContext("game", handlers);

    const toggleEvent = {
        key: "p", type: "keyup", preventDefault() {},
        shiftKey: false, ctrlKey: false, altKey: false, metaKey: false
    };
    const moveEvent = {
        key: "w", type: "keyup", preventDefault() {},
        shiftKey: false, ctrlKey: false, altKey: false, metaKey: false
    };

    dispatch("keyup", toggleEvent);
    assertEquals(
        toggleCount, 0,
        "Discrete action should NOT trigger on keyup"
    );

    dispatch("keyup", moveEvent);
    assertEquals(
        moveCount, 1,
        "Hold action SHOULD trigger on keyup"
    );
});
