---
description: Run the Lidar diagnostic screenshot test
---

# Lidar Diagnostic Test Workflow

Precondition: `http://localhost:4000` must be reachable and all three containers running.

## Steps

1. Read the test script file into memory:
   ```
   cat /home/gamete/_doxxx/Mutonex/repository/src/scripts/lidar_diag_test.js
   ```

2. Open the browser to `http://localhost:4000` (or reload if already open).

3. Execute the **entire content** of `lidar_diag_test.js` as a single `execute_browser_javascript` call. Wait for it to return the structured object `{ status: 'READY', ... }`. The script handles all timing internally — do NOT add extra waits.

4. Immediately after the call returns `READY`, take a screenshot. Save it with a descriptive name matching the TEST_CONFIG (e.g., `diag_mode_1_entropy_0`).

5. Log the returned state object verbatim.

## Changing test parameters

Edit `TEST_CONFIG` inside `lidar_diag_test.js` before running:
- `diagMode: 1.0` → red/blue y-plane diagnostic
- `diagMode: 0.0` → normal green render
- `entropy: 0.0` → no noise
- `scanMode: 0.0` → vertical (dense), `1.0` → horizontal bands

No other changes needed. The script resets the camera and applies all uniforms before resolving.
