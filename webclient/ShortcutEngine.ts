// webclient/ShortcutEngine.ts
import {
    SHORTCUTS,
    ShortcutEntry,
    ShortcutModifiers,
    ShortcutScope
} from "./ShortcutConfig.ts";

export type KeyState = ReadonlySet<string>;
export type ActionHandler = (
    entry: ShortcutEntry,
    event: KeyboardEvent
) => void;
export type HandlerMap = Map<string, ActionHandler>;

/**
 * Normalizes a key and modifiers into a consistent representation.
 */
export const normalizeKey = (
    key: string,
    mods: ShortcutModifiers = {}
): string => {
    const parts = [
        mods.ctrl && key !== "Control" && "Ctrl",
        mods.shift && key !== "Shift" && "Shift",
        mods.alt && key !== "Alt" && "Alt",
        mods.meta && key !== "Meta" && "Meta"
    ];
    const modPrefix = parts.filter(Boolean).join("+");
    const normalizedChar = key.length === 1 ? key.toLowerCase() : key;
    return modPrefix ? `${modPrefix}+${normalizedChar}` : normalizedChar;
};

const isInputFocused = (): boolean => {
    const active = document.activeElement;
    return !!active && (
        active.tagName === "INPUT" ||
        active.tagName === "TEXTAREA" ||
        (active as HTMLElement).isContentEditable
    );
};

// Cooldown to prevent multi-firing across context switches
let lastTapTime = 0;

// Track physically pressed keys to prevent repeat/bounce issues
const pressedKeys = new Set<string>();

const isRepeatOrCooldown = (
    match: ShortcutEntry,
    now: number
): boolean => {
    if (!match.hold && now - lastTapTime < 250) return true;
    if (!match.hold) lastTapTime = now;
    return false;
};

export const activateContext = (
    scope: ShortcutScope,
    handlers: HandlerMap
): AbortController => {
    const controller = new AbortController();
    const activeShortcuts = SHORTCUTS.filter(
        e => e.scope === "global" || e.scope === scope
    );

    const keyMap = new Map<string, ShortcutEntry>(
        activeShortcuts.map(e => [
            normalizeKey(e.key, e.modifiers), e
        ])
    );

    window.addEventListener("keydown", (e: KeyboardEvent) => {
        if (isInputFocused()) return;
        const mods = {
            shift: e.shiftKey, ctrl: e.ctrlKey,
            alt: e.altKey, meta: e.metaKey
        };
        const key = e.key;
        if (pressedKeys.has(key)) return;

        const match = keyMap.get(normalizeKey(key, mods));
        if (!match) return;
        if (e.repeat && !match.repeat) return;

        const now = Date.now();
        if (isRepeatOrCooldown(match, now)) return;

        pressedKeys.add(key);
        e.preventDefault();
        handlers.get(match.action)?.(match, e);
    }, { signal: controller.signal });

    // Keyup only propagates for current context's 'hold' actions.
    window.addEventListener("keyup", (e: KeyboardEvent) => {
        const key = e.key;
        pressedKeys.delete(key);

        const mods = {
            shift: e.shiftKey, ctrl: e.ctrlKey,
            alt: e.altKey, meta: e.metaKey
        };
        const match = keyMap.get(normalizeKey(key, mods));
        if (match?.hold) handlers.get(match.action)?.(match, e);
    }, { signal: controller.signal });

    window.addEventListener("blur", () => {
        pressedKeys.clear();
    }, { signal: controller.signal });

    return controller;
};

export const registerHandler = (
    handlers: HandlerMap,
    action: string,
    handler: ActionHandler
): HandlerMap => {
    handlers.set(action, handler);
    return handlers;
};

export const printHelp = () => {
    const headerStyle = "color: #000000; font-weight: bold;";
    console.log(
        "%cMUTONEX SHORTCUTS:",
        headerStyle + "font-size: 14px;"
    );
    const scopes: ShortcutScope[] = [
        "global", "lobby", "game", "globe"
    ];
    scopes.forEach(scope => {
        const list = SHORTCUTS.filter(entry => entry.scope === scope);
        if (list.length === 0) return;
        console.group(`%c${scope.toUpperCase()}`, headerStyle);
        list.forEach(entry => {
            const keyCol = entry.key.padEnd(10);
            console.log(
                `%c${keyCol}%c : ${entry.description}`,
                "color: #000; font-weight: bold;",
                "color: #333;"
            );
        });
        console.groupEnd();
    });
};

export const dispatchRepeatingActions = (
    _state: KeyState,
    _handlers: HandlerMap
) => {
    // Legacy support
};
