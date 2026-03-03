# BUG: Unit Geometry Rendering as Cubes

**Date**: 2026-03-03

**Description**:
Unit geometry is not rendering as intended. Instead of the intended Unifont glyph 3D extruded polygons, they are rendering as plain cubes.

**Expected Behavior**:
Units should be represented by 3D extruded polygons based on Unifont glyphs.

**Current Behavior**:
Units appear as simple plain cubes.

**Notes**:
Check the `BufferGeometryLoader` or the logic that swaps the placeholder geometry for the generated glyph geometry in the entity update pipeline.
