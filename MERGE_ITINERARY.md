# Merge Itinerary: Lidar View Integration

## Overview
This itinerary outlines the steps to merge the Webclient Lidar rendering improvements from `feat-lidar-view...` into the current branch. This involves replacing the current monolithic `main.ts` rendering logic with the modular `ViewManager` architecture and adding necessary assets.

## Steps

### 1. Import Types and Globals
- **Source:** `remotes/origin/feat-lidar-view...`
- **Target:** `src/webclient/`
- **Files:**
    - `src/webclient/types.ts` (New file)
    - `src/webclient/global_types.ts` (New file)

### 2. Import View Components
- **Source:** `remotes/origin/feat-lidar-view...`
- **Target:** `src/webclient/`
- **Files:**
    - `src/webclient/ViewManager.ts` (Update/Create)
    - `src/webclient/LidarView.ts` (Update/Create)
    - `src/webclient/SphereView.ts` (New file - encapsulates legacy logic)

### 3. Import Assets
- **Source:** `remotes/origin/feat-lidar-view...`
- **Target:** `src/res/geometry/` and `src/webclient/assets/`
- **Actions:**
    - Copy all `src/res/geometry/*.json` files.
    - Copy `src/webclient/assets/unifont.ttf`.
    - Copy `src/webclient/assets/NotoEmoji-Regular.ttf`.

### 4. Import Build Scripts & Docs
- **Source:** `remotes/origin/feat-lidar-view...`
- **Target:** `src/scripts/` and `src/webclient/`
- **Files:**
    - `src/scripts/generate_geometry.ts` (New)
    - `src/webclient/GEOMETRY_STRATEGY.md` (New)
    - `src/webclient/RENDERING_ARCHITECTURE.md` (New)

### 5. Update Main Application Entry
- **File:** `src/webclient/main.ts`
- **Action:** Rewrite `main.ts` to use `ViewManager`, `LidarView`, and `SphereView` instead of direct scene manipulation.
- **Reference:** Use `remote_main.ts` content analyzed previously.

### 6. Update Build Configuration
- **File:** `src/scripts/bundle-webclient.sh`
- **Action:** Ensure it copies `src/res/geometry` to the distribution folder (`dist/assets/geometry`).

### 7. Verification
- **Build:** Run `src/scripts/bundle-webclient.sh` (if environment permits, or mock verify).
- **Static Analysis:** Check imports in `main.ts` resolve to the new files.

## Conflict Resolution
- **GameStateProvider:** The Lidar branch might have an older or different `GameStateProvider`. We should *keep* the current HEAD version if it supports the Simtellus backend correctly, BUT check if Lidar view expects different data types.
    - *Check:* Lidar `main.ts` imports `PlayerTuple` from `MockGameStateProvider`. Current `main.ts` does the same.
    - *Decision:* Keep current `GameStateProvider.ts` but ensure `main.ts` interface matches.
