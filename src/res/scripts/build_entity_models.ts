// Geometry generation pipeline.
// Reads entity icons from the Design Document,
// extracts vector paths from GNU Unifont OTF files
// via opentype.js, and produces pre-baked
// BufferGeometry JSON files for the webclient.
//
// Usage: deno run --allow-read --allow-write --allow-net scripts/build_entity_models.ts
// Output: src/res/models/<CODEPOINT_HEX>.json

import { DOMParser } from "https://deno.land/x/deno_dom/deno-dom-wasm.ts";
import opentype from "npm:opentype.js";
import * as THREE from "npm:three";

const DESIGN_DOC_PATH = "../docs/mutonex-design-document.html";
const FONT_PATHS = [
  "/usr/share/fonts/opentype/unifont/unifont.otf",
  "/usr/share/fonts/opentype/unifont/unifont_upper.otf",
  "/usr/share/fonts/opentype/unifont/unifont_csur.otf",
];
const OUTPUT_DIR = "res/entity_geometry";

export interface GlyphProfile {
  name?: string;
  isStationary?: boolean;
  scale?: number;
  elevateY?: number;
  facing?: "front" | "side" | "top";
}

let GLYPH_REGISTRY: Record<string, Partial<GlyphProfile>> = {};

// Load glyph mapping logic
async function loadGlyphRegistry() {
  const file = await Deno.readTextFile("res/glyph_profiles.json");
  const data = JSON.parse(file);

  const registry: Record<string, Partial<GlyphProfile>> = {};

  for (const [hex, entry] of Object.entries(data.glyphs)) {
    const templateName = (entry as any).template;
    const template = templateName ? data.templates[templateName] : {};
    const char = String.fromCodePoint(parseInt(hex, 16));

    // Merge template base properties with glyph-specific overrides
    registry[char] = { ...template, ...(entry as any) };
  }

  return registry;
}

// --- Exported for unit testing ---

export function convertOpentypePathToThreeShapes(
  path: any,
): THREE.Shape[] {
  const shapePath = new THREE.ShapePath();

  for (const cmd of path.commands) {
    switch (cmd.type) {
      case "M":
        shapePath.moveTo(cmd.x, cmd.y);
        break;
      case "L":
        shapePath.lineTo(cmd.x, cmd.y);
        break;
      case "Q":
        shapePath.quadraticCurveTo(
          cmd.x1,
          cmd.y1,
          cmd.x,
          cmd.y,
        );
        break;
      case "C":
        shapePath.bezierCurveTo(
          cmd.x1,
          cmd.y1,
          cmd.x2,
          cmd.y2,
          cmd.x,
          cmd.y,
        );
        break;
      case "Z":
        break;
    }
  }

  const shapes = shapePath.toShapes(false);

  return shapes.filter((shape: THREE.Shape) => {
    const points = shape.getPoints();
    if (points.length < 4 || points.length > 5) {
      return true;
    }

    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;
    for (const p of points) {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }

    const w = maxX - minX;
    const h = maxY - minY;

    // GID 0 border is width 0.375, height 0.6875.
    const isBorder = Math.abs(w - 0.375) < 0.01 &&
      Math.abs(h - 0.6875) < 0.01;

    if (isBorder) {
      console.log("Filtering out border shape.");
    }

    return !isBorder;
  });
}

async function main() {
  console.log("Parsing Glyph Registry JSON...");
  GLYPH_REGISTRY = await loadGlyphRegistry();

  console.log("Reading Design Doc...");
  const html = await Deno.readTextFile(
    DESIGN_DOC_PATH,
  );
  const doc = new DOMParser().parseFromString(
    html,
    "text/html",
  );

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

  // Inject explicitly configured Registry items so they get generated even if omitted from docs.
  for (const char of Object.keys(GLYPH_REGISTRY)) {
    icons.add(char);
  }
  console.log(
    `Found ${icons.size} unique icons:`,
    icons,
  );

  console.log("Loading Fonts...");
  const fonts: opentype.Font[] = [];
  for (const p of FONT_PATHS) {
    try {
      const buf = await Deno.readFile(p);
      fonts.push(
        opentype.parse(buf.buffer),
      );
      console.log(`Loaded ${p}`);
    } catch (_e) {
      console.warn(
        `Could not load ${p}, skipping.`,
      );
    }
  }

  if (fonts.length === 0) {
    console.error(
      "No GNU Unifont files loaded!",
    );
    Deno.exit(1);
  }

  try {
    await Deno.mkdir(
      OUTPUT_DIR,
      { recursive: true },
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
      const glyphIndex = font.charToGlyphIndex(char);
      if (glyphIndex === 0) continue;

      console.log(`Extracting path for ${char}...`);
      const tp = font.getPath(
        char,
        0,
        0,
        1,
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
        `${char} (U+${hex})`,
      );
      continue;
    }

    const shapes = convertOpentypePathToThreeShapes(path);

    if (shapes.length === 0) {
      const hex = char.codePointAt(0)
        ?.toString(16);
      console.warn(
        `No shapes for ` +
        `${char} (U+${hex})`,
      );
      continue;
    }
    const geometry = new THREE.ExtrudeGeometry(shapes, {
      depth: 0.20,
      bevelEnabled: false,
    });

    // Invert upright (SVG Y-coordinates go down, Three.js Y goes up)
    geometry.rotateX(Math.PI);

    // Center on X and Z, and place base securely at Y=0 (feet on the ground)
    geometry.computeBoundingBox();
    const bb = geometry.boundingBox!;
    const cx = -0.5 * (bb.max.x + bb.min.x);
    const cz = -0.5 * (bb.max.z + bb.min.z);
    geometry.translate(cx, -bb.min.y, cz);

    // Serialize as raw BufferGeometry
    // (float arrays, not shape params).
    const raw = geometry.toNonIndexed();
    raw.computeVertexNormals();

    const pure = new THREE.BufferGeometry();
    for (const key in raw.attributes) {
      pure.setAttribute(key, raw.attributes[key]);
    }

    const json = pure.toJSON();

    const profile = GLYPH_REGISTRY[char] || {
      name: "Unknown",
      isStationary: true,
      scale: 2.0,
      elevateY: 0.0,
      facing: "front",
    };

    const matrix = new THREE.Matrix4();
    const scale = profile.scale ?? 2.0;
    const elevateY = profile.elevateY ?? 0.0;
    const facing = profile.facing ?? "front";

    // Build the transform: translate, rotate, then scale
    matrix.makeTranslation(0, elevateY, 0);

    if (facing === "side") {
      const rot = new THREE.Matrix4().makeRotationY(-Math.PI / 2);
      matrix.multiply(rot);
    } else if (facing === "top") {
      const rot = new THREE.Matrix4().makeRotationX(-Math.PI / 2);
      matrix.multiply(rot);
    }

    matrix.scale(new THREE.Vector3(scale, scale, scale));

    json.mutonex_entity_metadata = {
      name: profile.name ?? "Unknown",
      isStationary: profile.isStationary ?? true,
      transform: {
        matrix: matrix.toArray()
      }
    };
    const hex = char.codePointAt(0)!
      .toString(16).toUpperCase();
    await Deno.writeTextFile(
      `${OUTPUT_DIR}/${hex}.json`,
      JSON.stringify(json),
    );
  }
  console.log("Done.");
}

if (import.meta.main) {
  await main();
}
