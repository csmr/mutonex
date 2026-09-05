// webclient/core/constants.ts

export const PHASE_LOBBY = "lobby";
export const PHASE_GAMEIN = "gamein";

export type GamePhase = typeof PHASE_LOBBY | typeof PHASE_GAMEIN;

export const SCOPE_GLOBAL = "global";
export const SCOPE_LOBBY = "lobby";
export const SCOPE_GAME = "game";
export const SCOPE_GLOBE = "globe";

export type AppShortcutScope =
  | typeof SCOPE_GLOBAL
  | typeof SCOPE_LOBBY
  | typeof SCOPE_GAME
  | typeof SCOPE_GLOBE;
