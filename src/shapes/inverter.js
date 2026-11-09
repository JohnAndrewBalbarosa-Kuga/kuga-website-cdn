// Procedural stand-in: a wall inverter with heat-sink fins on both sides and a small display.

import * as THREE from 'three';
import {
  addPart,
  box,
  brushedAluminium,
  charcoalPlastic,
  darkGlass,
  roundedBox,
  screenWithReadout,
  whiteCasing,
} from './mesh-helpers.js';

const BODY = { width: 0.56, height: 0.72, depth: 0.2, radius: 0.035 };
const FINS = { count: 9, depth: 0.05, thickness: 0.008, height: 0.6 };

export function buildMesh() {
  const group = new THREE.Group();
  addPart(group, roundedBox([BODY.width, BODY.height, BODY.depth], BODY.radius, 4), whiteCasing());
  addFins(group, -1);
  addFins(group, 1);
  addDisplay(group);
  addCableGlands(group);
  return group;
}

// Vertical fins standing off one side (-1 = left, 1 = right).
function addFins(group, side) {
  const fin = box([FINS.depth, FINS.height, FINS.thickness]);
  const material = brushedAluminium();
  const x = side * (BODY.width / 2 + FINS.depth / 2 - 0.004);
  const spacing = (BODY.depth - 0.04) / (FINS.count - 1);
  for (let i = 0; i < FINS.count; i += 1) {
    const z = -BODY.depth / 2 + 0.02 + i * spacing;
    addPart(group, fin, material, [x, 0, z]);
  }
}

function addDisplay(group) {
  const z = BODY.depth / 2;
  addPart(group, roundedBox([0.22, 0.13, 0.012], 0.006, 2), darkGlass(), [0, 0.17, z]);
  addPart(group, new THREE.PlaneGeometry(0.19, 0.1), screenWithReadout(), [0, 0.17, z + 0.0065]);
  addPart(group, roundedBox([0.3, 0.012, 0.006], 0.003, 1), charcoalPlastic(), [0, -0.22, z]);
}

function addCableGlands(group) {
  const gland = new THREE.CylinderGeometry(0.018, 0.018, 0.04, 20);
  const material = charcoalPlastic();
  [-0.15, -0.05, 0.05, 0.15].forEach((x) => {
    addPart(group, gland, material, [x, -BODY.height / 2 - 0.018, 0]);
  });
}
