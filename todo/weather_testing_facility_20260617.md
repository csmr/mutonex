# TODO: Weather Testing Facility (GlobeView)

## Objective
Implement a dedicated diagnostic view within the `GlobeView` to visualize and audit the Simtellus planetary simulation's weather and insolation data.

## Requirements

### 1. UI Layout
- **Position**: Leftmost 1/4th of the browser window.
- **Background**: Transparent.
- **Meteo-Table**: 12-months weather table showing temperature and pressure.
- **Historical Stack**: Show statistics for the current year and 5 years preceding.
- **Sector Selector**: Calendar-style interface with Left/Right arrows around the sector coordinates/title.

### 2. Visual Style & Accessibility (AGENTS.md)
- **Colors**: Bright terminal green (#00ff00) text with black drop shadow for readability.
- **Backgrounds**: Table cells for months should have background colors mapped to their average temperature.
- **Accessibility**: Ensure large font sizes, clear button hit areas, and high contrast.
- **Cyber-Noir**: Consistent with the GDD aesthetic (dark background, neon highlights).

### 3. Data Integration
- **Overlay**: Superimpose weather state and insolation data directly on the Earth sphere sector surface.
- **Temperature Color**: The sector on the 3D globe should be colored based on its current temperature.
- **Backend API**: Connect to `DiagController` to fetch historical 5-year data.

### 4. Navigation & Feedback
- **Command Feedback**: Print shortcuts and commands to the Webclient console when entering this mode.
- **Keyboard Shortcuts**: Implementation of shortcuts for toggling this view and navigating sectors.

## Implementation Itinerary
- [ ] **Backend**: Implement `Mutonex.Net.Controllers.DiagController.weather_history/2`.
- [ ] **Frontend (Logic)**: Implement `GlobeView` state management for historical weather data.
- [ ] **Frontend (UI)**: Build the meteo-table and sector selector overlays.
- [ ] **Frontend (3D)**: Implement sector surface coloring and data labels on the globe.
- [ ] **Verification**: Audit against AGENTS.md accessibility standards.
