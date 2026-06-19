# Feature Card: Globe View Earth Wireframe Map (REFACTORED)

## Objective
Implement Earth's country borders on the 3D globe view (`GlobeView.ts`), creating a high-contrast "cyber-noir" wireframe map. This view is essential for both narrative consistency (determining unit ethnicity/tribe based on geography) and for the Weather Testing Facility.

## Status Context
The geodata file `webclient/assets/countries.topo.json` is available but its TopoJSON format is not natively supported by our current `GlobeView` logic.

## Requirements
- **Geometry**: Country borders must be rendered as bright green vector outlines (#00ff00) on the 3D Earth sphere.
- **Data Pipeline**: Pre-process `countries.topo.json` into a standard GeoJSON format during the build phase to minimize client-side overhead.
- **Nomenclature**: Analytical and accessible.
- **Visuals**: Cyber-noir aesthetic (bright green on black).

## Implementation Itinerary
- [ ] Create `webclient/generate_geojson.ts` to convert TopoJSON to GeoJSON using `topojson-client`.
- [ ] Integrate GeoJSON generation into `webclient/build-webclient.sh`.
- [ ] Update `GlobeView.ts` to fetch and render the outlines.
- [ ] Ensure outlines are visible and follow the Earth sphere curvature accurately.
