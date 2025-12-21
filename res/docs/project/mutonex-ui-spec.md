# Mutonex UI Specification and Technical Outline

This document specifies the UI and technical implementation for Mutonex, a browser-based, real-time strategy game.

## 1. Overview

The Mutonex UI provides an immersive, intuitive interface for fast-paced (12-minute) strategic gameplay. The central element is a 3D exoplanet globe, enabling players to manage units, form alliances, and compete for dominance.

### Core Design Principles:

*   **Globe-centric:** The primary view is an interactive 3D globe, fitting a 16:9 aspect ratio and adjusting to window size.
*   **Information Clarity:** The UI must present complex data clearly and efficiently, without overwhelming the player.
*   **Real-time Responsiveness:** The UI will reflect game state changes instantly via a persistent WebSocket connection.
*   **High-Level Strategy:** The design favors strategic decision-making over unit micromanagement.

## 2. Visual Style

*   **Theme:** Cyber Noir / Orange LIDAR. The UI will use a dark theme with a monochromatic color scheme, primarily using shades of high-contrast orange on a black or near-black background. This meets both aesthetic and accessibility goals.
*   **Globe Rendering:** The globe will not be a realistic texture. It will be rendered as a stylized vector or wireframe contour map, as if from a LIDAR scan. Continents and terrain features will be represented by glowing orange outlines and shaded polygons on a dark sphere.
*   **UI Elements:** All HUD elements, menus, text, and icons will adhere to the high-contrast, orange-on-dark palette.

## 3. Accessibility (WCAG 2.1)

Accessibility is a primary design goal. The UI must be perceivable, operable, understandable, and robust, targeting WCAG 2.1 Level AA.

*   **High Contrast:** The "Orange LIDAR" theme is designed for high contrast. All text and meaningful UI elements will meet or exceed a 4.5:1 contrast ratio.
*   **Color Independence:** Color will not be the sole means of conveying information. Patterns, icons, and text labels will be used to differentiate game elements like political control.
*   **Keyboard Navigation:** All interactive elements, including globe functions and menus, must be fully operable via the keyboard.
*   **Screen Reader Support:** ARIA attributes will be used extensively to ensure all components are understandable to screen readers. Visual information on the globe will have textual alternatives (e.g., announcing selected sector details).

## 4. Core UI Features

### 4.1. Interactive 3D Globe

The globe is the primary game view.

*   **Controls:**
    *   **Rotation:** Click-and-drag or keyboard arrows.
    *   **Zoom:** Mouse wheel or +/- keys.
    *   **Sector Selection:** Click or keyboard focus + Enter.
*   **Visuals:** Rendered in the "Orange LIDAR" style. Features subtle atmospheric glow and effects.

### 4.2. Sector Grid Overlay

A 36x18 (10°x10°) grid is overlaid on the globe.

*   **Display:** The grid is visible at all zoom levels.
*   **Data Visualization:** Sectors are styled to show game data:
    *   **Political Control:** Differentiated by high-contrast orange shades and unique patterns/icons.
    *   **Terrain/Movement Cost:** Indicated by line style or iconography within the sector.
    *   **Resources:** Indicated by distinct icons.
*   **Interaction:** Hover or keyboard focus displays a tooltip with essential data.

### 4.3. Heads-Up Display (HUD)

Provides at-a-glance game state information, positioned at the screen edges.

*   **Elements:** Game Timer, Turn Counter, In-Game Date, Player Resources, and a 2D Mini-map.
*   **Accessibility:** All HUD elements will be high-contrast and keyboard-focusable where interactive.

### 4.4. Alliance & Diplomacy Menu

A modal or screen for managing faction relationships.

*   **Functionality:** View players, manage alliances, send predefined messages, and vote on proposals.

### 4.5. Chieftains-in-Video-Meet View

A dedicated view for real-time diplomacy via webcams or avatars, triggered during key votes or events.

## 5. Technical Implementation

This section outlines the proposed technology stack, compatible with the existing Deno/TypeScript webclient foundation.

### 5.1. Frontend Framework

*   **Recommendation:** **Svelte** or **Preact**.
*   **Justification:** High performance, small bundle sizes, and simplicity, ideal for a fast-loading game UI.

### 5.2. 3D Rendering

*   **Recommendation:** **Three.js**.
*   **Justification:** Mature, feature-rich, and high-performance WebGL library.

### 5.3. State Management

*   **Recommendation:** **Svelte Stores** or a lightweight custom solution.
*   **Justification:** A full state management library is unnecessary as the server drives the game state.

### 5.4. Server Communication

*   **Protocol:** **WebSockets**.
*   **Implementation:** A persistent connection to `gameserver` will be used.
*   **Message Format:** JSON.

## 6. Component Breakdown

This section describes the high-level UI components.

### 6.1. `Game.svelte` (or `Game.tsx`)

*   **Description:** The root component. Manages the WebSocket connection and overall game state.

### 6.2. `Globe.svelte`

*   **Description:** Renders the 3D globe with Three.js. Handles all 3D rendering and user interaction.
*   **Props:** `sectors`, `units`.
*   **Events:** `on:sectorClick`, `on:sectorFocus`.

### 6.3. `HUD.svelte`

*   **Description:** Renders the HUD. A "dumb" component that displays data passed to it.
*   **Props:** `gameTimer`, `turn`, `inGameDate`, `resources`, `politicalData`.

### 6.4. `SectorInfoPanel.svelte`

*   **Description:** Displays detailed information for the selected sector.
*   **Props:** `sector` object.
*   **Accessibility:** Content will be structured for clear screen reader announcements.

### 6.5. `DiplomacyMenu.svelte`

*   **Description:** A modal for managing diplomacy.
*   **Props:** `players`, `alliances`.
*   **Accessibility:** Fully keyboard-navigable with ARIA roles for all controls.
