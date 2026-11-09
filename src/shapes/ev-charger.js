// Procedural stand-in: a slim EV charging pedestal with a screen and a coiled cable.

import * as THREE from 'three';
import {
  addPart,
  charcoalPlastic,
  darkGlass,
  darkMetal,
  roundedBox,
  rubber,
  screenWithReadout,
  whiteCasing,
} from './mesh-helpers.js';

const PILLAR = { width: 0.24, height: 1.2, depth: 0.16 };
const HOLSTER = { x: PILLAR.width / 2 + 0.03, y: 0.12 };

export function buildMesh() {
  const group = new THREE.Group();
  addPart(group, roundedBox([PILLAR.width, PILLAR.height, PILLAR.depth], 0.04, 4), whiteCasing());
  addPart(group, roundedBox([0.34, 0.03, 0.26], 0.01, 2), darkMetal(), [0, -PILLAR.height / 2 - 0.015, 0]);
  addFrontStrip(group);
  addScreen(group);
  addHolster(group);
  addCoiledCable(group);
  return group;
}

function addFrontStrip(group) {
  addPart(group, roundedBox([0.07, 0.5, 0.01], 0.004, 2), charcoalPlastic(), [0, -0.2, PILLAR.depth / 2]);
}

function addScreen(group) {
  const y = PILLAR.height / 2 - 0.2;
  const z = PILLAR.depth / 2;
  addPart(group, roundedBox([0.17, 0.12, 0.012], 0.006, 2), darkGlass(), [0, y, z]);
  addPart(group, new THREE.PlaneGeometry(0.15, 0.1), screenWithReadout(), [0, y, z + 0.0065]);
}

function addHolster(group) {
  addPart(group, roundedBox([0.06, 0.14, 0.09], 0.02, 2), charcoalPlastic(), [HOLSTER.x, HOLSTER.y, 0]);
}

// The cable leaves the holster, coils down beside the pillar and ends near the base.
function addCoiledCable(group) {
  const curve = new CoilCurve({
    centre: [HOLSTER.x + 0.03, 0, 0.02],
    radius: 0.055,
    top: HOLSTER.y - 0.07,
    bottom: -PILLAR.height / 2 + 0.12,
    turns: 7,
  });
  addPart(group, new THREE.TubeGeometry(curve, 420, 0.011, 8, false), rubber());
}

class CoilCurve extends THREE.Curve {
  constructor({ centre, radius, top, bottom, turns }) {
    super();
    this.centre = centre;
    this.radius = radius;
    this.top = top;
    this.bottom = bottom;
    this.turns = turns;
  }

  getPoint(t, target = new THREE.Vector3()) {
    const angle = t * this.turns * Math.PI * 2;
    const y = this.top + (this.bottom - this.top) * t;
    const [x, , z] = this.centre;
    return target.set(x + Math.cos(angle) * this.radius, y, z + Math.sin(angle) * this.radius);
  }
}
