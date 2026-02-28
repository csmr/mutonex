# Feature Card: Globe View Earth Wireframe Map

## Objective
Revive the effort to draw Earth's country borders on the 3D globe view (`GlobeView.ts`), creating a classic retro "wireframe map" aesthetic that fits the Mutonex theme.

## Status Context
The geodata file `src/webclient/assets/countries.topo.json` contains high-resolution vectors for every country on Earth. It is currently unused. The previous implementation attempt failed due to a format mismatch.

## The Technical Problem
The existing `#drawFeatures` method in `GlobeView.ts` expects **GeoJSON** arrays of `[longitude, latitude]` points. However, the `countries.topo.json` file is in **TopoJSON** format (using integer `arcs` to reference shared boundaries). `GlobeView.ts` cannot decode this format natively, which is why the map fails to render.

## Implementation Plan

To implement the Earth wireframe map, use one of the following approaches (Option B is recommended):

### Option A: The Frontend Approach
Import a TopoJSON parser directly into `GlobeView.ts` to decode the geometry before rendering.
1. Add `topojson-client` dependency (e.g., via esm.sh or npm).
2. Fetch `countries.topo.json` on client load.
3. Parse: `const geoJson = topojson.feature(topoData, topoData.objects.countries);`
4. Pass `geoJson.features` into `this.#drawFeatures()`.

### Option B: The Build Approach (Recommended)
Pre-process the file to avoid forcing the client to load and execute an extra mapping library for static data.
1. Create a Deno script `src/scripts/generate_geojson.ts`.
2. Use `topojson-client` in the script to load `countries.topo.json` and convert the `objects.countries` GeometryCollection into a standard GeoJSON FeatureCollection.
3. Output the result to `src/res/geometry/countries.geo.json`.
4. Update `GlobeView.ts` to fetch this new `.geo.json` file. Because it's standard GeoJSON, the existing `#drawFeatures` logic will parse it perfectly out of the box.
