# Entity 3D Models Strategy

## Overview

Entities (Units, Fauna, Minerals) are represented by Unicode
characters and Emojis (e.g., '🧙', '🦗', '💎') rendered as
**3D extruded models** for the LIDAR depth-scanning effect.

## Font Source

**GNU Unifont** via OTF files (`unifont.otf`,
`unifont_upper.otf`, `unifont_csur.otf`). Dual-width
monochrome glyphs match the "Low-Fi" aesthetic while
covering all required Unicode planes. Parsed offline at
build time — no fonts shipped to client.

## Model Generation Pipeline

The Deno script `content-package/generators/build_entity_models.ts` drives
the pipeline:

1. Reads entity icons from the Design Document.
2. Extracts vector paths via `opentype.js`.
3. Converts paths to `THREE.Shape` via `THREE.ShapePath`
   to correctly handle winding orders and internal holes.
4. Filters out the fallback glyph border (GID 0) which
   can cause models to appear as solid blocks.
5. Extrudes paths via `THREE.ExtrudeGeometry` (depth=1).
6. Centering and Grounding: Models are centered on X and
   translated on Y so their base (min Y) sits at 0.0.
7. Serializes as non-indexed `THREE.BufferGeometry` JSON.
8. Output: `content/res/entity_geometry/<CODEPOINT_HEX>.json`.

## Runtime Loading

The client (`views/LidarView.ts`) lazily fetches these assets
via `BufferGeometryLoader` from `assets/entity_geometry/`.

## Rendering Pipeline

See `../webclient/RENDERING_ARCHITECTURE.md` § LidarView for the full
GPU pipeline. In summary:

1. Extruded models placed in a hidden Virtual Scene.
2. Linear depth pass renders to a FloatType target.
3. Point cloud shader reconstructs positions from depth.
