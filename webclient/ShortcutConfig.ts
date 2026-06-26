// webclient/ShortcutConfig.ts

export type ShortcutScope = "global" | "lobby" | "game" | "globe";

export interface ShortcutModifiers {
    shift?: boolean;
    ctrl?: boolean;
    alt?: boolean;
    meta?: boolean;
}

export interface ShortcutEntry {
    key: string;
    modifiers?: ShortcutModifiers;
    action: string;
    description: string;
    scope: ShortcutScope;
    repeat: boolean;
}

// [key, modifiers, action, description, scope, repeat?]
type RawShortcut = [string, ShortcutModifiers | null, string, string, ShortcutScope, boolean?];

const RAW: RawShortcut[] = [
    // Global
    ["Tab", null, "toggle_view", "Switch View", "global"],
    ["g", null, "toggle_globe", "Toggle Globe", "global"],

    // Lobby
    ["ArrowUp", null, "lobby_prev", "Prev Sector", "lobby"],
    ["ArrowDown", null, "lobby_next", "Next Sector", "lobby"],
    ["Enter", null, "lobby_join", "Join Sector", "lobby"],

    // Game (Movement)
    ["w", null, "move_fwd", "Forward", "game", true],
    ["s", null, "move_back", "Backward", "game", true],
    ["a", null, "move_left", "Left", "game", true],
    ["d", null, "move_right", "Right", "game", true],
    ["ArrowUp", null, "move_fwd", "Forward", "game", true],
    ["ArrowDown", null, "move_back", "Backward", "game", true],
    ["ArrowLeft", null, "move_left", "Left", "game", true],
    ["ArrowRight", null, "move_right", "Right", "game", true],

    // Game (Controls)
    ["l", null, "cycle_style", "Scan Mode", "game"],
    ["[", null, "dec_entropy", "Less Noise", "game"],
    ["]", null, "inc_entropy", "More Noise", "game"],

    // Globe
    ["d", null, "toggle_diag", "Weather Facility", "globe"],
    ["ArrowUp", null, "rot_up", "Rotate Up", "globe", true],
    ["ArrowDown", null, "rot_down", "Rotate Down", "globe", true],
    ["ArrowLeft", null, "rot_left", "Rotate Left", "globe", true],
    ["ArrowRight", null, "rot_right", "Rotate Right", "globe", true],
];

export const SHORTCUTS: ReadonlyArray<ShortcutEntry> = Object.freeze(
    RAW.map(([key, modifiers, action, description, scope, repeat]) => ({
        key, modifiers: modifiers || {}, action, description, scope, repeat: !!repeat
    }))
);
