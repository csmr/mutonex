# Webclient Geometry & Rendering Strategy

## Overview
This document outlines the implementation choices for generating 3D geometry for in-game entities in the webclient, specifically focusing on the "High-Tech / Low-Fi" LIDAR rendering style.

## Entity Representation
The game design specifies that entities (Units, Fauna, Minerals) are represented by specific Unicode characters and Emojis (e.g., '🧙', '🦗', '💎') rather than textured 3D models. This matches the "High-Tech / Low-Fi" aesthetic.

## Geometry Implementation
To render these characters as **3D extruded models** suitable for the LIDAR depth-scanning effect, we utilize vector font geometry.

### 1. Font Source: Noto Emoji
We use **Noto Emoji (Regular)** via TrueType Font (TTF).
*   **Reason**: Standard browser fonts or basic Three.js JSON fonts (like Helvetiker) lack the necessary glyph coverage for Emojis and upper-plane Unicode symbols. Noto Emoji provides robust, open-source vector paths for these characters.
*   **Loading**: We use `TTFLoader` (backed by `opentype.js`) to parse the `.ttf` file at runtime. This avoids the need to pre-convert large Unicode fonts into Three.js JSON format, which would result in massive file sizes.

### 2. Geometry Generation: TextGeometry
*   **Technique**: The parsed font is used to generate `THREE.TextGeometry`.
*   **Extrusion**: Characters are extruded to provide volume (Depth). This is crucial for the LIDAR effect: a flat 2D plane would render as a single thin line in the point cloud when viewed from the side. Extrusion ensures the "Scanner" hits the object from multiple angles.
*   **Scale**: 1 Unit = 1 Meter (approx). The font size is calibrated to match the game's scale.

### 3. Optimization
*   **Caching**: Generating geometry from vector paths is CPU-intensive. We implement a `geometryCache` (`Map<string, THREE.TextGeometry>`) to ensure each unique character (e.g., '🧙') is generated only once and reused across all instances.
*   **Instancing**: (Future Consideration) For massive counts, `InstancedMesh` could be used, but given the diversity of characters and current entity counts, simple Mesh reuse with shared geometry is effective and simple.

## Rendering Pipeline (LIDAR)
1.  **Virtual Scene**: The Extruded Text Geometries are placed in a hidden "Virtual Scene".
2.  **Depth Pass**: This scene is rendered to a **Depth Texture**.
3.  **Reconstruction**: A Point Cloud shader samples this texture to reconstruct the visible surface points, creating the "Scanning" visual effect.

## Why this approach?
*   **Correctness**: Accurately renders the specific Design Document symbols.
*   **Aesthetics**: Perfect fit for the "Lidar" style—entities look like holographic projections or scanned signatures.
*   **Flexibility**: Changing an entity's look is as simple as changing its character string.
