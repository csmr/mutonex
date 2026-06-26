// webclient/ShortcutEngine.ts
import { SHORTCUTS, ShortcutEntry, ShortcutModifiers } from "./ShortcutConfig.ts";

export type KeyState = ReadonlySet<string>;
export type ActionHandler = (entry: ShortcutEntry) => void;
export type HandlerMap = ReadonlyMap<string, ActionHandler>;

// Precomputed lookups for O(1) performance
const keyToEntries = new Map<string, ShortcutEntry[]>();
const actionToEntries = new Map<string, ShortcutEntry[]>();

/**
 * Normalizes a key and its modifiers into a consistent string representation.
 */
export const normalizeKey = (key: string, mods: ShortcutModifiers = {}): string => {
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

// Initialize lookups once on module load
SHORTCUTS.forEach(entry => {
    const normalized = normalizeKey(entry.key, entry.modifiers);
    if (!keyToEntries.has(normalized)) keyToEntries.set(normalized, []);
    keyToEntries.get(normalized)!.push(entry);

    if (!actionToEntries.has(entry.action)) actionToEntries.set(entry.action, []);
    actionToEntries.get(entry.action)!.push(entry);
});

export const pressKey = (state: KeyState, key: string, mods: ShortcutModifiers): KeyState =>
    new Set([...state, normalizeKey(key, mods)]);

export const releaseKey = (state: KeyState, key: string, mods: ShortcutModifiers): KeyState => {
    const next = new Set(state);
    next.delete(normalizeKey(key, mods));
    return next;
};

/**
 * Checks if an action is active based on the current key state.
 * Implements 'fuzzy' matching for basic actions: if an entry is defined
 * with no modifiers, it allows any modifier combination to trigger it.
 */
export const isActionActive = (state: KeyState, action: string): boolean => {
    const entries = actionToEntries.get(action) || [];
    return entries.some(entry => {
        const normalized = normalizeKey(entry.key, entry.modifiers);
        if (state.has(normalized)) return true;

        const hasNoModifiers = Object.values(entry.modifiers || {}).every(v => !v);
        if (hasNoModifiers) {
            const rawKey = normalizeKey(entry.key);
            return Array.from(state).some(pressed => pressed.endsWith(rawKey));
        }
        return false;
    });
};

export const dispatchSingleActions = (key: string, mods: ShortcutModifiers, handlers: HandlerMap) => {
    const entries = keyToEntries.get(normalizeKey(key, mods)) || [];
    entries.filter(e => !e.repeat).forEach(e => handlers.get(e.action)?.(e));
};

export const dispatchRepeatingActions = (state: KeyState, handlers: HandlerMap) => {
    state.forEach(normalized => (keyToEntries.get(normalized) || [])
        .filter(entry => entry.repeat)
        .forEach(entry => handlers.get(entry.action)?.(entry)));
};

export const registerHandler = (handlers: HandlerMap, action: string, handler: ActionHandler): HandlerMap =>
    new Map(handlers).set(action, handler);

export const unregisterHandler = (handlers: HandlerMap, action: string): HandlerMap => {
    const next = new Map(handlers);
    next.delete(action);
    return next;
};

export const printHelp = () => {
    const headerStyle = "color: #00ff00; font-weight: bold;";
    console.log("%cMUTONEX SHORTCUTS:", headerStyle + "font-size: 14px;");
    ["global", "lobby", "game", "globe"].forEach(scope => {
        const list = SHORTCUTS.filter(entry => entry.scope === scope);
        if (list.length === 0) return;
        console.group(`%c${scope.toUpperCase()}`, headerStyle);
        list.forEach(entry => {
            const keyCol = entry.key.padEnd(10);
            console.log(`%c${keyCol}%c : ${entry.description}`,
                "color: #0f0; font-weight: bold;", "color: #ccc;");
        });
        console.groupEnd();
    });
};
