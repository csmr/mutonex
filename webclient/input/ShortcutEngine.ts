// webclient/input/ShortcutEngine.ts
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
    const normalized = key.length === 1 ? key.toLowerCase() : key;
    return modPrefix ? `${modPrefix}+${normalized}` : normalized;
};

const isInputFocused = (): boolean => {
    const active = document.activeElement;
    return !!active && (
        active.tagName === "INPUT" ||
        active.tagName === "TEXTAREA" ||
        (active as HTMLElement).isContentEditable
    );
};

let lastTapTime = 0;
const pressedKeys = new Set<string>();

const isRepeatOrCooldown = (
    match: ShortcutEntry,
    now: number
): boolean => {
    if (!match.hold && now - lastTapTime < 250) return true;
    if (!match.hold) lastTapTime = now;
    return false;
};

export const handleKeyEvent = (
    entry: ShortcutEntry,
    event: KeyboardEvent,
    handlers: HandlerMap
): void => {
    const { action, eventType } = entry;
    const handler = handlers.get(action);
    if (!handler) return;
    if (eventType === "both" || event.type === eventType) {
        handler(entry, event);
    }
};

function handleKeyDown(
    keyMap: Map<string, ShortcutEntry>,
    handlers: HandlerMap,
    e: KeyboardEvent
) {
    if (isInputFocused()) return;
    const mods = {
        shift: e.shiftKey, ctrl: e.ctrlKey,
        alt: e.altKey, meta: e.metaKey
    };
    const key = e.key;
    if (pressedKeys.has(key)) return;
    const match = keyMap.get(normalizeKey(key, mods));
    if (!match || (e.repeat && !match.repeat)) return;
    if (isRepeatOrCooldown(match, Date.now())) return;
    pressedKeys.add(key);
    e.preventDefault();
    handleKeyEvent(match, e, handlers);
}

function handleKeyUp(
    keyMap: Map<string, ShortcutEntry>,
    handlers: HandlerMap,
    e: KeyboardEvent
) {
    const key = e.key;
    pressedKeys.delete(key);
    const mods = {
        shift: e.shiftKey, ctrl: e.ctrlKey,
        alt: e.altKey, meta: e.metaKey
    };
    const match = keyMap.get(normalizeKey(key, mods));
    if (match) handleKeyEvent(match, e, handlers);
}

function buildKeyMap(
    scope: ShortcutScope
): Map<string, ShortcutEntry> {
    const active = SHORTCUTS.filter(
        e => e.scope === "global" || e.scope === scope
    );
    return new Map<string, ShortcutEntry>(
        active.map(e => [normalizeKey(e.key, e.modifiers), e])
    );
}

export const activateContext = (
    scope: ShortcutScope,
    handlers: HandlerMap
): AbortController => {
    const controller = new AbortController();
    const keyMap = buildKeyMap(scope);
    window.addEventListener(
        "keydown",
        (e: KeyboardEvent) => handleKeyDown(keyMap, handlers, e),
        { signal: controller.signal }
    );
    window.addEventListener(
        "keyup",
        (e: KeyboardEvent) => handleKeyUp(keyMap, handlers, e),
        { signal: controller.signal }
    );
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
        const list = SHORTCUTS.filter(e => e.scope === scope);
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
