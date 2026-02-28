/**
 * lidar_diag_test.js
 *
 * Self-contained Lidar diagnostic test harness.
 * Run this as a single execute_browser_javascript call.
 *
 * The script handles all timing internally:
 *   1. Waits for window.__mutonex (JS bundle loaded)
 *   2. Waits for #lobby-view to gain class 'hidden' (game-in phase)
 *   3. Resets camera to the canonical default (0, 8, 20)
 *   4. Applies requested test configuration (diagMode, entropy, etc.)
 *   5. Waits two animation frames so GPU flushes the next render
 *   6. Returns a structured state object
 *
 * After this function resolves, call capture_browser_screenshot immediately.
 * No other JS calls are needed between resolve and screenshot.
 *
 * Usage (browser console or execute_browser_javascript):
 *   Copy-paste entire file content as one expression.
 *
 * Configuration — edit the TEST_CONFIG block below before running:
 */

(async function lidarDiagTest() {

    // ── TEST CONFIGURATION ──────────────────────────────────────────────────
    const TEST_CONFIG = {
        diagMode: 0.0,   // 0.0 = normal green
        entropy: 0.0,    // no noise
        scanMode: 1.0,   // 1.0 = horizontal bands
        dotRadiusMin: 2.0, // smaller background dots
        dotRadiusMax: 7.0, // HUGE foreground dots to test dynamic size
        dotType: 1.0,    // 1.0 = circle
        cameraPos: [0, 8, 20],  // canonical default: camera above and behind
        cameraTarget: [0, 0, 0],  // orbit centre
        timeoutMs: 12000, // max ms to wait for game-in before failing
    };
    // ────────────────────────────────────────────────────────────────────────

    function poll(condition, timeoutMs, intervalMs) {
        return new Promise(function (resolve, reject) {
            const deadline = Date.now() + timeoutMs;
            (function check() {
                try {
                    const v = condition();
                    if (v) { resolve(v); return; }
                } catch (_) { }
                if (Date.now() > deadline) {
                    reject(new Error('poll timed out after ' + timeoutMs + 'ms'));
                    return;
                }
                setTimeout(check, intervalMs);
            })();
        });
    }

    function waitFrames(n) {
        return new Promise(function (resolve) {
            (function tick(remaining) {
                if (remaining <= 0) { resolve(); return; }
                requestAnimationFrame(function () { tick(remaining - 1); });
            })(n);
        });
    }

    // ── 1. Wait for the JS bundle to initialise window.__mutonex ────────────
    await poll(
        function () {
            return window.__mutonex && window.__mutonex.lidarView &&
                window.__mutonex.lidarView.lidarMaterial;
        },
        TEST_CONFIG.timeoutMs, 100
    );

    // ── 2. Wait for the lobby overlay to disappear (#lobby-view.hidden) ─────
    await poll(
        function () {
            const el = document.getElementById('lobby-view');
            return el && el.classList.contains('hidden');
        },
        TEST_CONFIG.timeoutMs, 100
    );

    // ── 3. Apply test configuration ──────────────────────────────────────────
    const lv = window.__mutonex.lidarView;
    const u = lv.lidarMaterial.uniforms;

    lv.camera.position.set(
        TEST_CONFIG.cameraPos[0],
        TEST_CONFIG.cameraPos[1],
        TEST_CONFIG.cameraPos[2]
    );
    lv.controls.target.set(
        TEST_CONFIG.cameraTarget[0],
        TEST_CONFIG.cameraTarget[1],
        TEST_CONFIG.cameraTarget[2]
    );
    lv.controls.update();

    u.diagMode.value = TEST_CONFIG.diagMode;
    u.entropy.value = TEST_CONFIG.entropy;
    u.scanMode.value = TEST_CONFIG.scanMode;

    // ── 4. Flush two frames so the GPU renders with the new uniforms ─────────
    await waitFrames(2);

    // ── 5. Return structured state for the test log ──────────────────────────
    return {
        status: 'READY',
        diagMode: u.diagMode.value,
        entropy: u.entropy.value,
        scanMode: u.scanMode.value,
        cameraPosition: lv.camera.position.toArray(),
        controlsTarget: lv.controls.target.toArray(),
        virtualSceneObjects: lv.virtualScene.children.length,
        time: u.time.value,
    };

})();
