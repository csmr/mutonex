# Proposal: Visual 3D Rendering & Outline Test Suite

## Overview

This proposal outlines how to codify and integrate automated 3D
visual regression and shader verification testing into the
Mutonex repository.

## Methodology & Workflow Steps

The visual verification method consists of six automated steps:

1. **Bundle Static Assets:**
   - Execute `npx esbuild webclient/core/main.ts --bundle`
     with `--define:__DEV_MODE_ENABLED__='"true"'`.
   - Ensure `webclient/mutonex.html` is synchronized.

2. **Spin Up Static Local Server:**
   - Host `dist/` or repository root on a local port (e.g., 8080)
     using Python's `http.server`.

3. **Headless Browser Execution (Playwright):**
   - Launch Chromium with WebGL hardware/software acceleration flags.
   - Set viewport dimensions (e.g., 1280x720).

4. **Canvas Initialization & Frame Settlement:**
   - Navigate to `http://localhost:8080/dist/index.html`.
   - Wait for `#game-canvas` and RAF loop settlement (500–1000ms).

5. **Shader & Shortcut Interactions:**
   - Dispatch simulated keypresses via `page.keyboard.press()`
     (e.g., `'l'` for style cycling, `'k'` for shade modes).
   - Capture console output to verify active view and shader logs.

6. **Screenshot Artifact Generation & Diffing:**
   - Capture baseline visual screenshots (e.g., point cloud,
     line LIDAR, procedural outlines).
   - Compare captured frame buffers against baseline snapshots.

## Proposed Repository Integration

### File Locations
- Script entrypoint: `webclient/scripts/test_visual.sh`
- Playwright runner: `webclient/scripts/test_visual_rendering.py`
- Baseline snapshots: `webclient/tests/fixtures/visual_baselines/`

### Execution Command
```bash
bash webclient/scripts/test_visual.sh
```

## Integration Plan

1. **Phase 1: Test Runner Script**
   - Add `test_visual_rendering.py` wrapping Playwright headless
     browser capture with console assertion checks.

2. **Phase 2: Baseline Snapshot Gallery**
   - Store baseline images for standard 3D entity models and
     LIDAR outline modes.

3. **Phase 3: CI & Test Harness Integration**
   - Reference `test_visual.sh` under `webclient/tests/test.sh`
     and `.agents/AGENTS.md` verification procedures.
