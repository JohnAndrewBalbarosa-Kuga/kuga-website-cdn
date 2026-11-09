// Procedural stand-in: a commercial hot water storage tank (the tank only, no heat pump unit).
// A tall insulated cylinder in a brushed stainless jacket with a domed top, trim bands, four feet,
// cold inlet and hot outlet fittings with ball valves on the front, a temperature / pressure relief
// valve high on the side with its drain line, a small control display and an element cover.
// Sizes are in metres (about a 315 L tank: 640 mm across, 1.87 m tall); fitted into a unit box later.

import * as THREE from 'three';
import {
  addPart,
  brass,
  charcoalPlastic,
  copperPipe,
  darkMetal,
  paintedRed,
  roundedBox,
  rubber,
  screenWithReadout,
  stainlessSteel,
} from './mesh-helpers.js';

// bodyStep: the straight jacket is cut into rings this tall (metres), so the shatter breaks it into
// even pieces instead of splitting long thin strips (about 7.4k fragments without it).
const TANK = { radius: 0.32, bodyHeight: 1.55, topDome: 0.16, bottomDome: 0.06, sides: 32, bodyStep: 0.15 };
const FEET = { height: 0.1, radius: 0.022, padRadius: 0.04, ringRadius: 0.22 };
const BAND = { height: 0.035, thickness: 0.006 };
const PIPE = { radius: 0.011, stub: 0.07, sides: 8, segments: 14 };
const VALVE = { radius: 0.022, length: 0.07, leverLength: 0.11 };
const INLET = { x: -0.1, y: 0.3 }; // y measured from the floor
const OUTLET = { x: 0.1, y: 1.45 };
const RELIEF_VALVE = { angle: 0.9, y: 1.52, drainEndY: 0.16 }; // angle in radians from the front towards +x
const DISPLAY = { width: 0.17, height: 0.11, depth: 0.03, y: 1.0 };
const ELEMENT_COVER = { x: 0.12, y: 0.5, radius: 0.06, depth: 0.04 };

export function buildMesh() {
  const group = new THREE.Group();
  const materials = {
    jacket: stainlessSteel(),
    trim: darkMetal(),
    plastic: charcoalPlastic(),
    copper: copperPipe(),
    brass: brass(),
    lever: paintedRed(),
    feet: rubber(),
    screen: screenWithReadout(),
  };

  addTankBody(group, materials);
  addBands(group, materials);
  addFeet(group, materials);
  addValvedFitting(group, { ...INLET, run: 'down' }, materials);
  addValvedFitting(group, { ...OUTLET, run: 'up' }, materials);
  addReliefValve(group, materials);
  addDisplay(group, materials);
  addElementCover(group, materials);
  addAnodeCap(group, materials);
  return group;
}

// One lathe: shallow dome underneath, straight jacket, rounder dome on top.
function addTankBody(group, materials) {
  const { radius, bodyHeight, topDome, bottomDome, sides } = TANK;
  const profile = [];
  const quarterSteps = 6;
  for (let i = 0; i <= quarterSteps; i += 1) {
    const angle = (Math.PI / 2) * (i / quarterSteps);
    profile.push(new THREE.Vector2(radius * Math.sin(angle), bottomDome * (1 - Math.cos(angle))));
  }
  const bodySteps = Math.ceil(bodyHeight / TANK.bodyStep);
  for (let i = 1; i < bodySteps; i += 1) {
    profile.push(new THREE.Vector2(radius, bottomDome + (bodyHeight * i) / bodySteps));
  }
  for (let i = 0; i <= quarterSteps; i += 1) {
    const angle = (Math.PI / 2) * (i / quarterSteps);
    profile.push(new THREE.Vector2(radius * Math.cos(angle), bottomDome + bodyHeight + topDome * Math.sin(angle)));
  }
  profile[profile.length - 1].x = 0.0001; // close the top without a degenerate seam
  addPart(group, new THREE.LatheGeometry(profile, sides), materials.jacket, [0, FEET.height, 0]);
}

function getTankTop() {
  return FEET.height + TANK.bottomDome + TANK.bodyHeight + TANK.topDome;
}

// Darker trim bands where the jacket meets the domes.
function addBands(group, materials) {
  const radius = TANK.radius + BAND.thickness;
  const band = new THREE.CylinderGeometry(radius, radius, BAND.height, TANK.sides, 1, true);
  const lowY = FEET.height + TANK.bottomDome + BAND.height / 2;
  const highY = FEET.height + TANK.bottomDome + TANK.bodyHeight - BAND.height / 2;
  [lowY, highY].forEach((y) => addPart(group, band, materials.trim, [0, y, 0]));
}

function addFeet(group, materials) {
  const leg = new THREE.CylinderGeometry(FEET.radius, FEET.radius, FEET.height, 10);
  const pad = new THREE.CylinderGeometry(FEET.padRadius, FEET.padRadius, 0.012, 14);
  for (let i = 0; i < 4; i += 1) {
    const angle = Math.PI / 4 + (i * Math.PI) / 2;
    const x = Math.sin(angle) * FEET.ringRadius;
    const z = Math.cos(angle) * FEET.ringRadius;
    addPart(group, leg, materials.trim, [x, FEET.height / 2 + 0.006, z]);
    addPart(group, pad, materials.feet, [x, 0.006, z]);
  }
}

// A stub out of the front, a ball valve with a red lever, then copper pipe turning down or up.
function addValvedFitting(group, { x, y, run }, materials) {
  const surfaceZ = getFrontSurfaceZ(x);
  const stub = new THREE.CylinderGeometry(PIPE.radius * 1.4, PIPE.radius * 1.4, PIPE.stub, PIPE.sides);
  addPart(group, stub, materials.brass, [x, y, surfaceZ + PIPE.stub / 2 - 0.01], [Math.PI / 2, 0, 0]);

  const valveZ = surfaceZ + PIPE.stub + VALVE.length / 2 - 0.01;
  const valve = new THREE.CylinderGeometry(VALVE.radius, VALVE.radius, VALVE.length, 12);
  addPart(group, valve, materials.brass, [x, y, valveZ], [Math.PI / 2, 0, 0]);
  addPart(group, new THREE.CylinderGeometry(0.008, 0.008, 0.03, 8), materials.brass, [x, y + VALVE.radius + 0.012, valveZ]);
  addPart(group, roundedBox([VALVE.leverLength, 0.01, 0.022], 0.004, 1), materials.lever, [x + VALVE.leverLength / 2 - 0.01, y + VALVE.radius + 0.03, valveZ]);

  const startZ = valveZ + VALVE.length / 2;
  const sign = run === 'down' ? -1 : 1;
  const endY = run === 'down' ? 0.04 : y + 0.3;
  addPipe(group, [
    [x, y, startZ - 0.005],
    [x, y, startZ + 0.06],
    [x, y + sign * 0.06, startZ + 0.1],
    [x, endY, startZ + 0.1],
  ], materials.copper);
}

// Temperature / pressure relief valve high on the side, with its drain line down to the floor.
function addReliefValve(group, materials) {
  const { angle, y, drainEndY } = RELIEF_VALVE;
  const outward = new THREE.Vector3(Math.sin(angle), 0, Math.cos(angle));
  const at = (distance, height) => {
    const point = outward.clone().multiplyScalar(TANK.radius + distance);
    return [point.x, height, point.z];
  };

  const valve = new THREE.CylinderGeometry(0.026, 0.026, 0.08, 12);
  const valveMesh = addPart(group, valve, materials.brass, at(0.04, y));
  valveMesh.lookAt(new THREE.Vector3(...at(1, y)));
  valveMesh.rotateX(Math.PI / 2); // cylinder axis points out of the tank
  addPart(group, roundedBox([0.07, 0.012, 0.02], 0.004, 1), materials.brass, at(0.06, y + 0.04));

  addPipe(group, [at(0.07, y - 0.02), at(0.1, y - 0.08), at(0.1, y - 0.25), at(0.1, drainEndY)], materials.copper);
}

function addPipe(group, points, material) {
  const curve = new THREE.CatmullRomCurve3(points.map((point) => new THREE.Vector3(...point)));
  addPart(group, new THREE.TubeGeometry(curve, PIPE.segments, PIPE.radius, PIPE.sides, false), material);
}

// Small control box with a lit readout, on the front at chest height.
function addDisplay(group, materials) {
  const { width, height, depth, y } = DISPLAY;
  const z = getFrontSurfaceZ(0) + depth / 2 - 0.006;
  addPart(group, roundedBox([width, height, depth], 0.008, 1), materials.plastic, [0, y, z]);
  addPart(group, new THREE.PlaneGeometry(width * 0.72, height * 0.55), materials.screen, [0, y + 0.01, z + depth / 2 + 0.001]);
}

function addElementCover(group, materials) {
  const { x, y, radius, depth } = ELEMENT_COVER;
  const z = getFrontSurfaceZ(x) + depth / 2 - 0.01;
  addPart(group, new THREE.CylinderGeometry(radius, radius, depth, 20), materials.plastic, [x, y, z], [Math.PI / 2, 0, 0]);
}

function addAnodeCap(group, materials) {
  const cap = new THREE.CylinderGeometry(0.03, 0.03, 0.025, 6);
  addPart(group, cap, materials.brass, [0, getTankTop() + 0.008, 0]);
}

// z of the jacket's front surface at a given x.
function getFrontSurfaceZ(x) {
  return Math.sqrt(Math.max(0, TANK.radius * TANK.radius - x * x));
}
