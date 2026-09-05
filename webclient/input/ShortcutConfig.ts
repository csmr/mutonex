// webclient/input/ShortcutConfig.ts

export type ShortcutScope = "global" | "lobby" | "game" | "globe";
export type ShortcutEventType = "keydown" | "keyup" | "both";

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
    readonly eventType: ShortcutEventType;
}

type RawShortcut = [
    string,
    ShortcutModifiers | null,
    string,
    string,
    ShortcutScope,
    boolean?,
    boolean?,
    ShortcutEventType?
];

const RAW: RawShortcut[] = [
    // Global
    ["p", null, "toggle_view", "Switch View", "global"],
    ["y", null, "toggle_globe", "Toggle Globe", "global"],

    // Lobby
    ["ArrowUp", null, "lobby_prev", "Prev Sector", "lobby"],
    ["ArrowDown", null, "lobby_next", "Next Sector", "lobby"],
    ["Enter", null, "lobby_join", "Join Sector", "lobby"],

    // Game (Movement)
    [
        "w", null, "move_fwd", "Forward", "game",
        true, true, "both"
    ],
    [
        "s", null, "move_back", "Backward", "game",
        true, true, "both"
    ],
    [
        "a", null, "move_left", "Left", "game",
        true, true, "both"
    ],
    [
        "d", null, "move_right", "Right", "game",
        true, true, "both"
    ],

    // Game (Controls)
    ["l", null, "cycle_style", "Scan Mode", "game"],
    ["u", null, "dec_entropy", "Less Noise", "game"],
    ["o", null, "inc_entropy", "More Noise", "game"],

    // Globe
    ["i", null, "toggle_diag", "Weather Facility", "globe"],
    [
        "w", null, "rot_up", "Rotate Up", "globe",
        true, true, "both"
    ],
    [
        "s", null, "rot_down", "Rotate Down", "globe",
        true, true, "both"
    ],
    [
        "a", null, "rot_left", "Rotate Left", "globe",
        true, true, "both"
    ],
    [
        "d", null, "rot_right", "Rotate Right", "globe",
        true, true, "both"
    ],
    [
        "ArrowUp", null, "rot_up", "Rotate Up", "globe",
        true, true, "both"
    ],
    [
        "ArrowDown", null, "rot_down", "Rotate Down", "globe",
        true, true, "both"
    ],
    [
        "ArrowLeft", null, "rot_left", "Rotate Left", "globe",
        true, true, "both"
    ],
    [
        "ArrowRight", null, "rot_right", "Rotate Right", "globe",
        true, true, "both"
    ],
];

export const SHORTCUTS: ReadonlyArray<
    ShortcutEntry
> = Object.freeze(
    RAW.map(([
        key, mods, act, desc, scope, rep, hold, evType
    ]) => {
        const isHold = !!hold;
        const eventType: ShortcutEventType = evType ||
            (isHold ? "both" : "keydown");
        return {
            key,
            modifiers: mods || {},
            action: act,
            description: desc,
            scope,
            repeat: !!rep,
            hold: isHold,
            eventType
        };
    })
);
