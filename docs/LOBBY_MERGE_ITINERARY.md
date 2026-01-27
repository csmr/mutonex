# Merge Itinerary: Lobby View & Tests

## Overview
This itinerary outlines the steps to merge the Lobby View UI and comprehensive GameSession tests from `feat-game-session-phases...` into the current branch.

## Steps

### 1. Import Lobby View Component
- **Source:** `remotes/origin/feat-game-session-phases...`
- **Target:** `src/webclient/LobbyView.ts`
- **Action:** Copy file.

### 2. Integrate Lobby Logic into Main
- **File:** `src/webclient/main.ts`
- **Action:** Update to instantiate `LobbyView`, handle `onSectorSelect`, and manage visibility based on `game_phase`.
- **Reference:** `remote_main_phases.ts` analyzed previously.
- **Constraint:** Ensure compatibility with `ViewManager` (which was just merged). The LobbyView logic essentially wraps the *start* of the game. Once game starts, `ViewManager` takes over rendering. `LobbyView` overlays it.

### 3. Update HTML Structure
- **File:** `src/webclient/mutonex.html`
- **Action:** Add the DOM elements required by `LobbyView` (`lobby-view`, `sector-selection`, etc.).
- **Source:** Check `remote_mutonex.html` (need to fetch it first to be sure).

### 4. Integrate GameSession Tests
- **File:** `src/gameserver/test/engine/game_session_test.exs`
- **Action:** Update the mock module name to match HEAD (`Mutonex.Engine.SimtellusClientMock`).
- **Action:** Ensure `Application.put_env` uses the correct key.

### 5. Verification
- **Frontend:** Check `main.ts` compilation (static).
- **Backend:** Run `mix test` to verify the new `game_session_test.exs`.
