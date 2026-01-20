
import { DOMParser } from "https://deno.land/x/deno_dom/deno-dom-wasm.ts";
import opentype from "npm:opentype.js";
import * as THREE from "npm:three";
import { FontLoader } from "npm:three/examples/jsm/loaders/FontLoader.js";
import { TextGeometry } from "npm:three/examples/jsm/geometries/TextGeometry.js";

// We need to polyfill TTFLoader because it expects browser globals or similar
// Actually, it's easier to use opentype directly to get paths, or convert font to JSON first.
// Let's use opentype.js to get paths, then convert to Three Shapes.

const DESIGN_DOC_PATH = "docs/mutonex-design-document.html";
const FONT_PATH = "/usr/share/fonts/opentype/unifont/unifont.otf";
const OUTPUT_DIR = "src/res/geometry";

async function main() {
    console.log("Reading Design Doc...");
    const html = await Deno.readTextFile(DESIGN_DOC_PATH);
    const doc = new DOMParser().parseFromString(html, "text/html");

    if (!doc) {
        console.error("Failed to parse HTML");
        Deno.exit(1);
    }

    const icons = new Set<string>();
    const iconElements = doc.querySelectorAll(".feature-icon");

    for (const el of iconElements) {
        const text = el.textContent || "";
        // Extract individual characters (unicode aware)
        for (const char of text) {
            // Filter out whitespace
            if (char.trim().length > 0) {
                icons.add(char);
            }
        }
    }

    console.log(`Found ${icons.size} unique icons:`, icons);

    console.log("Loading Font...");
    // Load font buffer
    const fontBuffer = await Deno.readFile(FONT_PATH);
    const font = opentype.parse(fontBuffer.buffer);

    // Prepare Output Dir
    try {
        await Deno.mkdir(OUTPUT_DIR, { recursive: true });
    } catch (e) {
        if (!(e instanceof Deno.errors.AlreadyExists)) throw e;
    }

    // Generate Geometry
    for (const char of icons) {
        console.log(`Processing: ${char}`);
        const path = font.getPath(char, 0, 0, 1); // 1 unit size?
        // Note: Unifont is 16x16.
        // We want 1 unit tall.
        // Opentype path units depend on unitsPerEm.
        // Let's scale later.

        // Convert opentype commands to Three.js Shapes
        const shapes = convertPathToShapes(path);

        if (shapes.length === 0) {
            console.warn(`No shapes found for ${char}`);
            continue;
        }

        const geometry = new TextGeometry(char, {
            font: new THREE.Font(fontToThreeJson(font)), // Use standard Three font workflow if possible
            size: 1,
            height: 1, // Extrude depth
            curveSegments: 2,
            bevelEnabled: false
        });

        // Center it
        geometry.computeBoundingBox();
        const centerOffset = - 0.5 * ( geometry.boundingBox!.max.x - geometry.boundingBox!.min.x );
        geometry.translate(centerOffset, 0, 0);

        // Export to JSON
        const json = geometry.toJSON();
        const hex = char.codePointAt(0)!.toString(16).toUpperCase();
        await Deno.writeTextFile(`${OUTPUT_DIR}/${hex}.json`, JSON.stringify(json));
    }
    console.log("Done.");
}

// Helper: Convert opentype font to Three.js compatible JSON structure
// This is what Face.json in Three.js examples looks like
function fontToThreeJson(font: any) {
    const scale = (1000 * 100) / ( (font.unitsPerEm || 2048) * 72 );
    const result: any = {
        glyphs: {},
        cssFontWeight: "normal",
        ascender: Math.round(font.ascender),
        underlinePosition: Math.round(font.tables.post.underlinePosition),
        cssFontStyle: "normal",
        boundingBox: {
            yMin: Math.round(font.tables.head.yMin),
            xMin: Math.round(font.tables.head.xMin),
            yMax: Math.round(font.tables.head.yMax),
            xMax: Math.round(font.tables.head.xMax)
        },
        resolution: 1000,
        original_font_information: font.names
    };

    for (const key in font.glyphs.glyphs) {
        const glyph = font.glyphs.glyphs[key];
        if (glyph.unicode !== undefined) {
            const token = {};
            // Simplified conversion logic or reuse THREE.TTFLoader logic
            // Actually, it's safer to use THREE.TTFLoader's internal logic if possible,
            // but we can't easily import it without DOM.
            // Let's rely on `TextGeometry` accepting a valid font object.
            // Wait, passing a THREE.Font instance to TextGeometry works.
            // How do we get THREE.Font from opentype?
            // We need to convert the data.
        }
    }

    // Fallback: Since implementing full TTF->JSON conversion is complex,
    // let's use the Shapes directly from opentype path commands and ExtrudeGeometry.
    return {};
}

// Better Approach: Path -> Shapes -> ExtrudeGeometry
async function mainWithShapes() {
    console.log("Reading Design Doc...");
    const html = await Deno.readTextFile(DESIGN_DOC_PATH);
    const doc = new DOMParser().parseFromString(html, "text/html");

    if (!doc) {
        console.error("Failed to parse HTML");
        Deno.exit(1);
    }

    const icons = new Set<string>();
    const iconElements = doc.querySelectorAll(".feature-icon");

    for (const el of iconElements) {
        const text = el.textContent || "";
        for (const char of text) {
            if (char.trim().length > 0) {
                icons.add(char);
            }
        }
    }
    console.log(`Found ${icons.size} unique icons:`, icons);

    console.log("Loading Font...");
    const fontBuffer = await Deno.readFile(FONT_PATH);
    const font = opentype.parse(fontBuffer.buffer);

    try {
        await Deno.mkdir(OUTPUT_DIR, { recursive: true });
    } catch (e) { if (!(e instanceof Deno.errors.AlreadyExists)) throw e; }

    for (const char of icons) {
        // console.log(`Processing: ${char}`);

        const path = font.getPath(char, 0, 0, 1); // Size 1
        const shapes = path.commands.length > 0 ? convertOpentypePathToThreeShapes(path) : [];

        if (shapes.length === 0) {
            console.warn(`No shapes for ${char} (U+${char.codePointAt(0)?.toString(16)})`);
            continue;
        }

        const geometry = new THREE.ExtrudeGeometry(shapes, {
            depth: 1, // 1 meter deep
            bevelEnabled: false
        });

        geometry.computeBoundingBox();
        const centerOffset = - 0.5 * ( geometry.boundingBox!.max.x - geometry.boundingBox!.min.x );
        geometry.translate(centerOffset, 0, 0);

        const json = geometry.toJSON();
        const hex = char.codePointAt(0)!.toString(16).toUpperCase();
        await Deno.writeTextFile(`${OUTPUT_DIR}/${hex}.json`, JSON.stringify(json));
    }
    console.log("Done.");
}

function convertOpentypePathToThreeShapes(path: any): THREE.Shape[] {
    const shapes: THREE.Shape[] = [];
    let currentPath = new THREE.Shape();

    for (const cmd of path.commands) {
        switch (cmd.type) {
            case 'M': // Move
                currentPath.moveTo(cmd.x, cmd.y);
                break;
            case 'L': // Line
                currentPath.lineTo(cmd.x, cmd.y);
                break;
            case 'Q': // Quadratic
                currentPath.quadraticCurveTo(cmd.x1, cmd.y1, cmd.x, cmd.y);
                break;
            case 'C': // Bezier
                currentPath.bezierCurveTo(cmd.x1, cmd.y1, cmd.x2, cmd.y2, cmd.x, cmd.y);
                break;
            case 'Z': // Close
                currentPath.closePath();
                shapes.push(currentPath);
                currentPath = new THREE.Shape();
                break;
        }
    }
    return shapes;
}

if (import.meta.main) {
    await mainWithShapes();
}
