import * as THREE from "npm:three@0.136.0";
const loader = new THREE.BufferGeometryLoader();
const raw = new THREE.BufferGeometry();
raw.setAttribute("position", new THREE.BufferAttribute(new Float32Array([0, 0, 0, 1, 1, 1, 2, 2, 2]), 3));
// Simulate my pure JSON export
const json = raw.toJSON();
console.log(Object.keys(json.data));
try {
    loader.parse(json);
    console.log("Parsed successfully!");
} catch (e) {
    console.error("Error parsing:", e);
}
