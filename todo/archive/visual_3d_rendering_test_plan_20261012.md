# Proposal: Visual 3D Rendering & Outline Test Suite

## Overview

Automated 3D visual regression and shader verification testing
for Mutonex webclient rendering pipeline.

## Methodology & Workflow Steps

1. **Bundle Static Assets:**
   - Execute esbuild for `webclient/core/main.ts` with
     `--define:__DEV_MODE_ENABLED__='"true"'`.

2. **Spin Up Local HTTP Server:**
   - Host root or `dist/` on port 8080.

3. **Headless Playwright Browser Execution:**
   - Launch Chromium with WebGL acceleration flags.

4. **Shortcut Interaction & Parameter Cycling (`hjkl`):**
   - Dispatch `h`, `j`, `k`, `l` keypresses to cycle shader modes,
     styles, and rendering parameters.

5. **Smart Baseline Snapshot Generation:**
   - Automatically generate baseline snapshots under
     `webclient/tests/fixtures/visual_baselines/` if missing.
   - Compare captured frame buffers against baseline snapshots.

## Repository Integration

- Entrypoint script: `webclient/scripts/test_visual.sh`
- Playwright script: `webclient/scripts/test_visual_rendering.py`
- Test runner delegation: `.agents/test_webclient.sh` calls
  `webclient/tests/test.sh "$@"`.
- Optional flag `--visual` in `webclient/tests/test.sh` executes
  `test_visual.sh` after unit tests.
