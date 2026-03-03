# BUG: Unit Geometry Models Appear as Solid Blocks

**Date**: 2026-03-04

**Description**:
The 3D unit geometry models loaded into the client may appear as solid blocks/cubes despite efforts to fix them.

**Possible Causes to Investigate**:
- The extruded normals might be facing the wrong way.
- During `THREE.ExtrudeGeometry`, an outer boundary/box geometry is added for some reason, enveloping the resulting inner glyph geometry.
- The source Unicode Glyphs (Unifont) are derived from bitmaps, and they may have a black outer frame or boundary path that is also being extruded, turning the entire glyph into a solid square block.

**Suggested Next Steps**:
Review the OpenType path parsing in `generate_geometry.ts`. Check if the path commands (`M`, `L`, `Q`, `C`, `Z`) include an outer bounding box that needs to be filtered out before passing shape curves to `THREE.ExtrudeGeometry`.
