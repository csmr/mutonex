# TODO: Globe View Weather Testing Facility Plan

## Objective
Implement interactive UI controls and end-to-end weather
data availability in Globe View (`GlobeView.ts`), enabling
developers and players to inspect Simtellus atmospheric and
insolation metrics across global coordinates and seasons.

## Architectural Scope

### 1. Weather Data Availability & Ingestion
- **Simtellus HTTP Endpoint**: Integrate frontend queries
  with `/weather-history?lat={lat}&lon={lon}` provided by
  `Mutonex.Net.Controllers.DiagController`.
- **Payload Schema**: Ingest 5-year historical records
  including monthly temperature (°C), atmospheric pressure
  (hPa), and daily insolation (W/m²).
- **Offline / Sandbox Fallback**: Provide synthetic
  planetary formulas when running in disconnected test
  harnesses or dev mocks without Phoenix active.
- **Cache Strategy**: Retain fetched sector records in a
  coordinate-keyed LRU map (`Map<string, WeatherPayload>`)
  to prevent redundant HTTP requests when stepping coordinates.

### 2. Interactive UI Weather Controls
- **Dual-Axis Coordinate Steppers**:
  - Longitudinal navigation (◀ / ▶) with step sizes (±5°, ±10°).
  - Latitudinal navigation (▲ / ▼) with polar clamping
    ([-85°, 85°]).
  - Coordinate jump input / quick-select presets for major
    settlements and test sectors (`sector_alpha`, `sector_beta`).
- **Temporal & Metric Navigation**:
  - Year stepper to toggle historical stacks (Year 0 to -4).
  - Metric selector tabs (Temperature, Pressure, Insolation)
    to toggle heat-map emphasis in data tables.
- **Raycast Globe Sampling**:
  - Click on any point on the 3D Earth sphere to automatically
    resolve surface lat/lon and trigger diagnostic loading.

### 3. 3D Globe Visual Feedback
- **Target Sector Coordinate Marker**:
  - Position an animated 3D bounding sector box or beacon
    pin at selected (lat, lon) on the globe surface.
  - Dynamically tint target mesh based on current average
    temperature or selected metric color scale.
- **Camera Auto-Alignment**:
  - Optional smooth camera framing to rotate the globe group
    towards the currently selected diagnostic coordinates.
- **Atmospheric Metric Heatmap**:
  - Procedural sector mesh tinting or vertex shader layer
    reflecting planetary temperature gradient.

### 4. Accessibility & Cyber-Noir Aesthetic
- **High Contrast Styling**: Bright neon green (#00ff00)
  typography with solid semi-transparent backdrops (`#000000cc`).
- **Styling Architecture (CSS vs TS)**:
  - Consolidate diagnostic overlay CSS rules into
    `webclient/mutonex.html` (or dedicated stylesheet) under
    `#globe-diag-overlay`, `.globe-diag-table`, replacing
    imperative `applyOverlayBoxStyles` and
    `applyOverlayFontStyles` inline styles with CSS classes
    toggled dynamically by `GlobeView.ts`.
  - Keeps TypeScript views focused on Three.js rendering
    while maintaining responsive styling in CSS assets.
- **Semantic HTML & Keyboard Navigation**:
  - Support keyboard focus on all buttons and steppers.
  - Dedicated shortcut bindings (`i` for toggle, arrow keys
    for coordinate navigation in diagnostic mode).
- **Audio Feedback**: Subtle echolocation chirp using
  Web Audio API when sampling new coordinates.

## Implementation Itinerary

- [ ] **Data Model & Types**: Define `WeatherData`,
  `YearHistory`, and `MonthWeather` interfaces in
  `webclient/core/types.ts`.
- [ ] **Network Client & Fallback**: Implement robust
  weather fetching with offline fallback in `GlobeView.ts`.
- [ ] **Expanded UI Controls**: Add latitude steppers,
  direct coordinate input, and metric view toggles to
  diagnostic overlay.
- [ ] **3D Surface Marker & Raycasting**: Connect canvas
  click events to Earth raycaster and update marker mesh.
- [ ] **Automated Testing**:
  - Unit tests in `webclient/tests/globe_view_test.ts` for
    coordinate clamping, step navigation, and fallback data.
  - End-to-end Playwright tests verifying overlay render and
    interactive button clicks.
- [ ] **Code Quality Audit**:
  - Verify all functions remain under 11 lines.
  - Verify all lines remain under 68 characters.
