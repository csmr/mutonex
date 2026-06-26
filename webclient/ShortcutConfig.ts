// webclient/ShortcutConfig.ts

export type ShortcutScope = "global" | "lobby" | "game" | "globe";

export interface ShortcutModifiers {
    shift?: boolean;
    ctrl?: boolean;
    alt?: boolean;
    meta?: boolean;
}

export interface ShortcutEntry {
    readonly key: string;
    readonly modifiers: ShortcutModifiers;
    readonly action: string;
    readonly description: string;
    readonly scope: ShortcutScope;
    readonly repeat: boolean;
    readonly hold: boolean;
}

// [key, modifiers, action, description, scope, repeat?, hold?]
type RawShortcut = [string, ShortcutModifiers | null, string, string, ShortcutScope, boolean?, boolean?];

const RAW: RawShortcut[] = [
    // Global
    ["p", null, "toggle_view", "Switch View", "global", false, false],
    ["y", null, "toggle_globe", "Toggle Globe", "global", false, false],

    // Lobby
    ["ArrowUp", null, "lobby_prev", "Prev Sector", "lobby", false, false],
    ["ArrowDown", null, "lobby_next", "Next Sector", "lobby", false, false],
    ["Enter", null, "lobby_join", "Join Sector", "lobby", false, false],

    // Game (Movement)
    ["w", null, "move_fwd", "Forward", "game", true, true],
    ["s", null, "move_back", "Backward", "game", true, true],
    ["a", null, "move_left", "Left", "game", true, true],
    ["d", null, "move_right", "Right", "game", true, true],

    // Game (Controls)
    ["l", null, "cycle_style", "Scan Mode", "game", false, false],
    ["u", null, "dec_entropy", "Less Noise", "game", false, false],
    ["o", null, "inc_entropy", "More Noise", "game", false, false],

    // Globe
    ["i", null, "toggle_diag", "Weather Facility", "globe", false, false],
    ["w", null, "rot_up", "Rotate Up", "globe", true, true],
    ["s", null, "rot_down", "Rotate Down", "globe", true, true],
    ["a", null, "rot_left", "Rotate Left", "globe", true, true],
    ["d", null, "rot_right", "Rotate Right", "globe", true, true],
    ["ArrowUp", null, "rot_up", "Rotate Up", "globe", true, true],
    ["ArrowDown", null, "rot_down", "Rotate Down", "globe", true, true],
    ["ArrowLeft", null, "rot_left", "Rotate Left", "globe", true, true],
    ["ArrowRight", null, "rot_right", "Rotate Right", "globe", true, true],
];

export const SHORTCUTS: ReadonlyArray<ShortcutEntry> = Object.freeze(
    RAW.map(([key, modifiers, action, description, scope, repeat, hold]) => ({
        key, modifiers: modifiers || {}, action, description, scope,
        repeat: !!repeat, hold: !!hold
    }))
);
