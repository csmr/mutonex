# Webclient Geometry Strategy

## Overview
Entities (Units, Fauna, Minerals) are represented by Unicode characters and Emojis (e.g., '🧙', '🦗', '💎') rendered as **3D extruded models** for the LIDAR depth-scanning effect.

## Font Source
**GNU Unifont** via OTF files (`unifont.otf`, `unifont_upper.otf`, `unifont_csur.otf`). Dual-width monochrome glyphs match the "Low-Fi" aesthetic while covering all required Unicode planes. Parsed offline at build time — no fonts shipped to client.

## Geometry Generation
The Deno script `src/scripts/generate_geometry.ts` drives the pipeline:
1. Reads entity icons from the Design Document (`.feature-icon` elements).
2. Extracts vector paths from OTF files via `opentype.js`.
3. Converts paths to `THREE.Shape` arrays, then extrudes via `THREE.ExtrudeGeometry` (depth = 1 unit). Extrusion is critical — flat geometry would be invisible to the LIDAR scanner from oblique angles.
4. Serializes as raw `THREE.BufferGeometry` JSON (position/normal/uv float arrays), not shape parameters.
5. Output: `src/res/geometry/<CODEPOINT_HEX>.json`, one file per glyph.

The client (`LidarView.ts`) lazily fetches and caches these via `BufferGeometryLoader`.

## Rendering Pipeline
See `RENDERING_ARCHITECTURE.md` § LidarView for the full GPU pipeline. In summary:
1. Extruded geometries placed in a hidden Virtual Scene.
2. Linear depth pass renders to a **FloatType colour render target** (`z_view / cameraFar` in R channel).
3. Point cloud shader reconstructs world-space positions from the depth texture.
