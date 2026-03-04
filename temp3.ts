import * as THREE from "npm:three@0.136.0";
const shape = new THREE.Shape();
shape.moveTo(0, 0);
shape.lineTo(1, 0);
shape.lineTo(0, 1);
const ext = new THREE.ExtrudeGeometry(shape);
const nonIndex = ext.toNonIndexed();

const out = new THREE.BufferGeometry();
for (const key in nonIndex.attributes) {
    out.setAttribute(key, nonIndex.attributes[key]);
}

const json = out.toJSON();
console.log(Object.keys(json));
console.log(Object.keys(json.data));
