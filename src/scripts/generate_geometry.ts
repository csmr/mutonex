// Geometry generation pipeline.
// Reads entity icons from the Design Document,
// extracts vector paths from GNU Unifont OTF files
// via opentype.js, and produces pre-baked
// BufferGeometry JSON files for the webclient.
//
// Usage:  deno run -A generate_geometry.ts
// Output: src/res/geometry/<CODEPOINT_HEX>.json

import { DOMParser } from "https://deno.land/x/deno_dom/deno-dom-wasm.ts";
import opentype from "npm:opentype.js";
import * as THREE from "npm:three";

const DESIGN_DOC_PATH =
    "../docs/mutonex-design-document.html";
const FONT_PATHS = [
    "/usr/share/fonts/opentype/unifont/unifont.otf",
    "/usr/share/fonts/opentype/unifont/unifont_upper.otf",
    "/usr/share/fonts/opentype/unifont/unifont_csur.otf"
];
const OUTPUT_DIR = "res/geometry";

// --- Exported for unit testing ---

export function convertOpentypePathToThreeShapes(
    path: any
): THREE.Shape[] {
    const shapes: THREE.Shape[] = [];
    let current = new THREE.Shape();

    for (const cmd of path.commands) {
        switch (cmd.type) {
            case 'M':
                current.moveTo(cmd.x, cmd.y);
                break;
            case 'L':
                current.lineTo(cmd.x, cmd.y);
                break;
            case 'Q':
                current.quadraticCurveTo(
                    cmd.x1, cmd.y1,
                    cmd.x, cmd.y
                );
                break;
            case 'C':
                current.bezierCurveTo(
                    cmd.x1, cmd.y1,
                    cmd.x2, cmd.y2,
                    cmd.x, cmd.y
                );
                break;
            case 'Z':
                current.closePath();
                shapes.push(current);
                current = new THREE.Shape();
                break;
        }
    }
    return shapes;
}

async function main() {
    console.log("Reading Design Doc...");
    const html = await Deno.readTextFile(
        DESIGN_DOC_PATH
    );
    const doc = new DOMParser().parseFromString(
        html, "text/html"
    );

    if (!doc) {
        console.error("Failed to parse HTML");
        Deno.exit(1);
    }

    const icons = new Set<string>();
    const iconElements =
        doc.querySelectorAll(".feature-icon");

    for (const el of iconElements) {
        const text = el.textContent || "";
        for (const char of text) {
            if (char.trim().length > 0) {
                icons.add(char);
            }
        }
    }
    console.log(
        `Found ${icons.size} unique icons:`, icons
    );

    console.log("Loading Fonts...");
    const fonts: opentype.Font[] = [];
    for (const p of FONT_PATHS) {
        try {
            const buf = await Deno.readFile(p);
            fonts.push(
                opentype.parse(buf.buffer)
            );
            console.log(`Loaded ${p}`);
        } catch (_e) {
            console.warn(
                `Could not load ${p}, skipping.`
            );
        }
    }

    if (fonts.length === 0) {
        console.error(
            "No GNU Unifont files loaded!"
        );
        Deno.exit(1);
    }

    try {
        await Deno.mkdir(
            OUTPUT_DIR, { recursive: true }
        );
    } catch (e) {
        if (
            !(e instanceof Deno.errors.AlreadyExists)
        ) throw e;
    }

    for (const char of icons) {
        let path: opentype.Path | null = null;

        // Find the first font that supports
        // this character's path (>5 commands
        // filters out .notdef empty boxes).
        for (const font of fonts) {
            const tp = font.getPath(
                char, 0, 0, 1
            );
            if (tp.commands.length > 5) {
                path = tp;
                break;
            }
        }

        if (!path) {
            const hex = char.codePointAt(0)
                ?.toString(16);
            console.warn(
                `No valid glyph for ` +
                `${char} (U+${hex})`
            );
            continue;
        }

        const shapes =
            convertOpentypePathToThreeShapes(path);

        if (shapes.length === 0) {
            const hex = char.codePointAt(0)
                ?.toString(16);
            console.warn(
                `No shapes for ` +
                `${char} (U+${hex})`
            );
            continue;
        }

        const geometry =
            new THREE.ExtrudeGeometry(shapes, {
                depth: 1,
                bevelEnabled: false
            });

        geometry.computeBoundingBox();
        const bb = geometry.boundingBox!;
        const cx = -0.5 * (
            bb.max.x - bb.min.x
        );
        geometry.translate(cx, 0, 0);

        // Serialize as raw BufferGeometry
        // (float arrays, not shape params).
        const raw = new THREE.BufferGeometry();
        const idx = geometry.getIndex();
        if (idx) raw.setIndex(idx);
        raw.setAttribute(
            'position',
            geometry.getAttribute('position')
        );
        raw.setAttribute(
            'normal',
            geometry.getAttribute('normal')
        );
        const uv = geometry.getAttribute('uv');
        if (uv) raw.setAttribute('uv', uv);

        const json = raw.toJSON();
        const hex = char.codePointAt(0)!
            .toString(16).toUpperCase();
        await Deno.writeTextFile(
            `${OUTPUT_DIR}/${hex}.json`,
            JSON.stringify(json)
        );
    }
    console.log("Done.");
}

if (import.meta.main) {
    await main();
}

