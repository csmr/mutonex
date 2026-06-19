/**
 * @file webclient/generate_geojson.ts
 * @description Build-time script to convert TopoJSON geographic data into GeoJSON.
 * @source Original data: Natural Earth / World Atlas (Public Domain / CC0).
 * @reason Minimizes client-side dependencies and CPU overhead for GlobeView rendering.
 */
import * as topojson from "https://esm.sh/topojson-client@3.1.0";

async function main() {
  console.log("[ generate_geojson ] Loading TopoJSON...");
  const topoData = JSON.parse(await Deno.readTextFile("./assets/countries.topo.json"));

  console.log("[ generate_geojson ] Converting to GeoJSON...");
  const geojson = topojson.feature(topoData, topoData.objects.countries);

  const outputDir = "../content/res/geometry";
  await Deno.mkdir(outputDir, { recursive: true });

  console.log("[ generate_geojson ] Saving GeoJSON...");
  await Deno.writeTextFile(
    `${outputDir}/countries.geo.json`,
    JSON.stringify(geojson)
  );

  console.log("[ generate_geojson ] Done.");
}

main();
