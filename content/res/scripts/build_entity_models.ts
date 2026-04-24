// Geometry generation pipeline.
// Reads entity icons from the Design Document,
// extracts vector paths from GNU Unifont OTF files
// via opentype.js, and produces pre-baked
// BufferGeometry JSON files for the webclient.
//
// Usage: deno run --allow-read --allow-write --allow-net res/scripts/build_entity_models.ts
// Output: content/res/models/<CODEPOINT_HEX>.json

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

export interface GlyphRegistry {
  [char: string]: Partial<GlyphProfile>;
}

// --- Core Functions ---

export function convertOpentypePathToThreeShapes(
  path: opentype.Path,
): THREE.Shape[] {
  const shapePath = new THREE.ShapePath();
  for (const cmd of path.commands) {
    switch (cmd.type) {
      case "M": shapePath.moveTo(cmd.x, cmd.y); break;
      case "L": shapePath.lineTo(cmd.x, cmd.y); break;
      case "Q": shapePath.quadraticCurveTo(cmd.x1, cmd.y1, cmd.x, cmd.y); break;
      case "C": shapePath.bezierCurveTo(cmd.x1, cmd.y1, cmd.x2, cmd.y2, cmd.x, cmd.y); break;
      case "Z": break;
    }
  }
  return shapePath.toShapes(false).filter((shape: THREE.Shape) => {
    const points = shape.getPoints();
    if (points.length < 4 || points.length > 5) return true;
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;
    for (const p of points) {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }
    const isBorder = Math.abs(maxX - minX - 0.375) < 0.01 && Math.abs(maxY - minY - 0.6875) < 0.01;
    return !isBorder;
  });
}

export async function loadGlyphRegistry(): Promise<GlyphRegistry> {
  const file = await Deno.readTextFile("res/glyph_profiles.json");
  const data = JSON.parse(file);
  const registry: GlyphRegistry = {};
  for (const [hex, entry] of Object.entries(data.glyphs)) {
    const templateName = (entry as any).template;
    const template = templateName ? data.templates[templateName] : {};
    const char = String.fromCodePoint(parseInt(hex, 16));
    registry[char] = { ...template, ...(entry as any) };
  }
  return registry;
}

export async function loadFonts(): Promise<opentype.Font[]> {
  const fonts: opentype.Font[] = [];
  for (const path of FONT_PATHS) {
    try {
      const buf = await Deno.readFile(path);
      fonts.push(opentype.parse(buf.buffer));
      console.log(`Loaded ${path}`);
    } catch (_e) {
      console.warn(`Could not load ${path}, skipping.`);
    }
  }
  return fonts;
}

export async function extractIconsFromDesignDoc(): Promise<Set<string>> {
  const html = await Deno.readTextFile(DESIGN_DOC_PATH);
  const doc = new DOMParser().parseFromString(html, "text/html");
  if (!doc) throw new Error("Failed to parse HTML");
  const icons = new Set<string>();
  const iconElements = doc.querySelectorAll(".feature-icon");
  for (const el of iconElements) {
    const text = el.textContent || "";
    for (const char of text) if (char.trim().length > 0) icons.add(char);
  }
  return icons;
}

export function buildEntityTransform(profile: Partial<GlyphProfile>): THREE.Matrix4 {
  const matrix = new THREE.Matrix4();
  const scale = profile.scale ?? 2.0;
  const elevateY = profile.elevateY ?? 0.0;
  const facing = profile.facing ?? "front";
  matrix.makeTranslation(0, elevateY, 0);
  if (facing === "side") matrix.multiply(new THREE.Matrix4().makeRotationY(-Math.PI / 2));
  else if (facing === "top") matrix.multiply(new THREE.Matrix4().makeRotationX(-Math.PI / 2));
  matrix.scale(new THREE.Vector3(scale, scale, scale));
  return matrix;
}

export function serializeGeometry(
  geometry: THREE.BufferGeometry,
  profile: Partial<GlyphProfile>,
): string {
  const raw = geometry.toNonIndexed();
  raw.computeVertexNormals();
  const pure = new THREE.BufferGeometry();
  for (const key in raw.attributes) pure.setAttribute(key, raw.attributes[key]);
  const json = pure.toJSON();
  json.mutonex_entity_metadata = {
    name: profile.name ?? "Unknown",
    isStationary: profile.isStationary ?? true,
    transform: { matrix: buildEntityTransform(profile).toArray() }
  };
  return JSON.stringify(json);
}

export async function generateGeometryForChar(
  char: string,
  fonts: opentype.Font[],
  registry: GlyphRegistry,
): Promise<void> {
  let path: opentype.Path | null = null;
  for (const font of fonts) {
    const glyphIndex = font.charToGlyphIndex(char);
    if (glyphIndex === 0) continue;
    const tp = font.getPath(char, 0, 0, 1);
    if (tp.commands.length > 5) { path = tp; break; }
  }
  if (!path) {
    const hex = char.codePointAt(0)?.toString(16);
    console.warn(`No valid glyph for ${char} (U+${hex})`);
    return;
  }
  const shapes = convertOpentypePathToThreeShapes(path);
  if (shapes.length === 0) {
    const hex = char.codePointAt(0)?.toString(16);
    console.warn(`No shapes for ${char} (U+${hex})`);
    return;
  }
  const geometry = new THREE.ExtrudeGeometry(shapes, { depth: 0.20, bevelEnabled: false });
  geometry.rotateX(Math.PI);
  geometry.computeBoundingBox();
  const bb = geometry.boundingBox!;
  const cx = -0.5 * (bb.max.x + bb.min.x);
  const cz = -0.5 * (bb.max.z + bb.min.z);
  geometry.translate(cx, -bb.min.y, cz);
  const profile = registry[char] || { name: "Unknown", isStationary: true, scale: 2.0, elevateY: 0.0, facing: "front" };
  const hex = char.codePointAt(0)!.toString(16).toUpperCase();
  await Deno.writeTextFile(`${OUTPUT_DIR}/${hex}.json`, serializeGeometry(geometry, profile));
}

// --- Main ---

async function main() {
  console.log("Parsing Glyph Registry JSON...");
  const registry = await loadGlyphRegistry();
  console.log("Reading Design Doc...");
  const icons = await extractIconsFromDesignDoc();
  for (const char of Object.keys(registry)) icons.add(char);
  console.log(`Found ${icons.size} unique icons:`, icons);
  console.log("Loading Fonts...");
  const fonts = await loadFonts();
  if (fonts.length === 0) { console.error("No GNU Unifont files loaded!"); Deno.exit(1); }
  try { await Deno.mkdir(OUTPUT_DIR, { recursive: true }); } catch (e) { if (!(e instanceof Deno.errors.AlreadyExists)) throw e; }
  for (const char of icons) await generateGeometryForChar(char, fonts, registry);
  console.log("Done.");
}

if (import.meta.main) await main();