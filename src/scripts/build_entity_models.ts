// Geometry generation pipeline.
// Reads entity icons from the Design Document,
// extracts vector paths from GNU Unifont OTF files
// via opentype.js, and produces pre-baked
// BufferGeometry JSON files for the webclient.
//
// Usage:  deno run -A build_entity_models.ts
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
const OUTPUT_DIR = "res/models";

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

  const shapes = shapePath.toShapes(true);

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
      depth: 1,
      bevelEnabled: false,
    });

    geometry.computeBoundingBox();
    const bb = geometry.boundingBox!;
    const cx = -0.5 * (
      bb.max.x + bb.min.x
    );
    geometry.translate(cx, -bb.min.y, 0);

    // Serialize as raw BufferGeometry
    // (float arrays, not shape params).
    const raw = geometry.toNonIndexed();
    raw.computeVertexNormals();

    const json = raw.toJSON();
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
