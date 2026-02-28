// geometry_pipeline_test.ts
//
// Tests the convertOpentypePathToThreeShapes
// function from generate_geometry.ts using
// synthetic path command sets.
//
// Requires npm:three (used by the script).
// Run: deno test --allow-read src/webclient/tests/geometry_pipeline_test.ts

import {
    assertEquals,
    assertExists,
} from "https://deno.land/std@0.224.0/assert/mod.ts";

import {
    convertOpentypePathToThreeShapes,
} from "../../scripts/generate_geometry.ts";

// ── Tests ───────────────────────────────────

Deno.test(
    "convertOpentypePathToThreeShapes: " +
    "empty path returns no shapes",
    () => {
        const path = { commands: [] };
        const shapes =
            convertOpentypePathToThreeShapes(path);
        assertEquals(shapes.length, 0);
    },
);

Deno.test(
    "convertOpentypePathToThreeShapes: " +
    "single closed triangle returns 1 shape",
    () => {
        const path = {
            commands: [
                { type: "M", x: 0, y: 0 },
                { type: "L", x: 1, y: 0 },
                { type: "L", x: 0.5, y: 1 },
                { type: "Z" },
            ],
        };
        const shapes =
            convertOpentypePathToThreeShapes(path);
        assertEquals(shapes.length, 1);
        assertExists(shapes[0]);
    },
);

Deno.test(
    "convertOpentypePathToThreeShapes: " +
    "two closed subpaths return 2 shapes",
    () => {
        const path = {
            commands: [
                // First subpath (square)
                { type: "M", x: 0, y: 0 },
                { type: "L", x: 1, y: 0 },
                { type: "L", x: 1, y: 1 },
                { type: "L", x: 0, y: 1 },
                { type: "Z" },
                // Second subpath (triangle)
                { type: "M", x: 2, y: 0 },
                { type: "L", x: 3, y: 0 },
                { type: "L", x: 2.5, y: 1 },
                { type: "Z" },
            ],
        };
        const shapes =
            convertOpentypePathToThreeShapes(path);
        assertEquals(shapes.length, 2);
    },
);

Deno.test(
    "convertOpentypePathToThreeShapes: " +
    "quadratic curves produce a shape",
    () => {
        const path = {
            commands: [
                { type: "M", x: 0, y: 0 },
                {
                    type: "Q",
                    x1: 0.5, y1: 1,
                    x: 1, y: 0,
                },
                { type: "L", x: 0.5, y: -0.5 },
                { type: "Z" },
            ],
        };
        const shapes =
            convertOpentypePathToThreeShapes(path);
        assertEquals(shapes.length, 1);
    },
);

Deno.test(
    "convertOpentypePathToThreeShapes: " +
    "cubic bezier curves produce a shape",
    () => {
        const path = {
            commands: [
                { type: "M", x: 0, y: 0 },
                {
                    type: "C",
                    x1: 0.25, y1: 1,
                    x2: 0.75, y2: 1,
                    x: 1, y: 0,
                },
                { type: "L", x: 0.5, y: -0.5 },
                { type: "Z" },
            ],
        };
        const shapes =
            convertOpentypePathToThreeShapes(path);
        assertEquals(shapes.length, 1);
    },
);

Deno.test(
    "convertOpentypePathToThreeShapes: " +
    "unclosed path returns no shapes",
    () => {
        // No 'Z' command → no shapes pushed
        const path = {
            commands: [
                { type: "M", x: 0, y: 0 },
                { type: "L", x: 1, y: 0 },
                { type: "L", x: 0.5, y: 1 },
            ],
        };
        const shapes =
            convertOpentypePathToThreeShapes(path);
        assertEquals(shapes.length, 0);
    },
);
