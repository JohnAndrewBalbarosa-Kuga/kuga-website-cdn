// The back of the solar panel stand-in: three split junction boxes on the centre line, two cables
// with MC4-style plugs, a rating label, and the mounting rail profile.
// Sizes in metres, matching shapes/solar-panel.js. Segment counts are kept low on purpose: every
// triangle becomes a shatter fragment.

import * as THREE from 'three';
import { addPart, roundedBox, rubber, whiteCasing } from './mesh-helpers.js';
import { createLabelTexture } from './solar-label-texture.js';

const JUNCTION_BOX = { width: 0.07, height: 0.09, depth: 0.018, spacing: 0.32 };
const CABLE = { radius: 0.0045, segments: 28, sides: 6 };
const PLUG = { radius: 0.0085, length: 0.05, nutRadius: 0.0105, nutLength: 0.012, tipRadius: 0.0055, tipLength: 0.016, sides: 8 };
const RAIL = { width: 0.04, depth: 0.032, wall: 0.0035, step: 0.12 };
const LABEL = { width: 0.2, height: 0.12, x: 0.24, y: 0.2 };

export function addPanelBack(panel, { frame, materials }) {
  const backZ = frame.depth / 2 - frame.backsheetInset; // backsheet surface, seen from behind
  addJunctionBoxes(panel, backZ, materials);
  addCables(panel, backZ, materials);
  addLabel(panel, backZ);
}

// Split junction boxes, as on half-cut panels: one per string pair, on the centre line.
function addJunctionBoxes(panel, backZ, materials) {
  const { width, height, depth, spacing } = JUNCTION_BOX;
  const geometry = roundedBox([width, height, depth], 0.006, 1);
  [-spacing, 0, spacing].forEach((y) => addPart(panel, geometry, materials.plastic, [0, y, backZ - depth / 2]));
}

// One cable leaves the top box and one the bottom box; each loops across the backsheet and ends
// in a plug (female on +, male on -), clipped near the frame as an installer would leave them.
function addCables(panel, backZ, materials) {
  const z = backZ - CABLE.radius - 0.002;
  const top = JUNCTION_BOX.spacing + JUNCTION_BOX.height / 2;
  const bottom = -top;
  addCable(panel, materials, [
    [0, top - 0.01, z],
    [0, top + 0.06, z],
    [-0.12, top + 0.1, z],
    [-0.32, top + 0.04, z],
    [-0.4, top - 0.12, z],
  ], 'female');
  addCable(panel, materials, [
    [0, bottom + 0.01, z],
    [0, bottom - 0.06, z],
    [0.12, bottom - 0.1, z],
    [0.32, bottom - 0.04, z],
    [0.4, bottom + 0.12, z],
  ], 'male');
}

function addCable(panel, materials, points, plugType) {
  const curve = new THREE.CatmullRomCurve3(points.map((point) => new THREE.Vector3(...point)));
  addPart(panel, new THREE.TubeGeometry(curve, CABLE.segments, CABLE.radius, CABLE.sides, false), rubber());
  const end = curve.getPoint(1);
  const direction = curve.getTangent(1);
  panel.add(createPlug(end, direction, plugType, materials));
}

// MC4-style plug: body, hex nut where the cable enters, and a narrower tip.
// Built along +z, then turned to follow the cable.
function createPlug(position, direction, plugType, materials) {
  const plug = new THREE.Group();
  const { radius, length, nutRadius, nutLength, tipRadius, tipLength, sides } = PLUG;
  const bodyRadius = plugType === 'female' ? radius : radius * 0.85;
  addPart(plug, alongZ(new THREE.CylinderGeometry(nutRadius, nutRadius, nutLength, 6)), materials.plastic, [0, 0, nutLength / 2]);
  addPart(plug, alongZ(new THREE.CylinderGeometry(bodyRadius, bodyRadius, length, sides)), materials.plastic, [0, 0, nutLength + length / 2]);
  addPart(plug, alongZ(new THREE.CylinderGeometry(tipRadius, bodyRadius, tipLength, sides)), materials.plastic, [0, 0, nutLength + length + tipLength / 2]);
  plug.position.copy(position);
  plug.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), direction.clone().normalize());
  return plug;
}

function alongZ(geometry) {
  return geometry.rotateX(Math.PI / 2);
}

// Rating label on the backsheet (generic lines and a barcode, no brand).
function addLabel(panel, backZ) {
  const material = whiteCasing();
  material.map = createLabelTexture();
  material.clearcoat = 0;
  addPart(panel, new THREE.PlaneGeometry(LABEL.width, LABEL.height), material, [LABEL.x, LABEL.y, backZ - 0.0005], [0, Math.PI, 0]);
}

// A C-channel rail: its open side faces away from the panel. Runs along 'x' or 'y';
// its front face sits on z (the back of the frame).
export function addRail(parent, { length, x, y, z, axis, material }) {
  const geometry = createRailGeometry(length);
  if (axis === 'x') geometry.rotateZ(Math.PI / 2);
  addPart(parent, geometry, material, [x, y, z - RAIL.depth / 2]);
}

// Profile drawn in x (width) and z (depth), extruded along y.
function createRailGeometry(length) {
  const { width, depth, wall } = RAIL;
  const halfWidth = width / 2;
  const halfDepth = depth / 2;
  const lip = width * 0.28;
  const profile = new THREE.Shape();
  profile.moveTo(-halfWidth, halfDepth);
  profile.lineTo(halfWidth, halfDepth);
  profile.lineTo(halfWidth, -halfDepth);
  profile.lineTo(halfWidth - lip, -halfDepth);
  profile.lineTo(halfWidth - lip, -halfDepth + wall);
  profile.lineTo(halfWidth - wall, -halfDepth + wall);
  profile.lineTo(halfWidth - wall, halfDepth - wall);
  profile.lineTo(-halfWidth + wall, halfDepth - wall);
  profile.lineTo(-halfWidth + wall, -halfDepth + wall);
  profile.lineTo(-halfWidth + lip, -halfDepth + wall);
  profile.lineTo(-halfWidth + lip, -halfDepth);
  profile.lineTo(-halfWidth, -halfDepth);
  profile.closePath();

  const steps = Math.ceil(length / RAIL.step); // short steps: fewer, chunkier shatter fragments
  const geometry = new THREE.ExtrudeGeometry(profile, { depth: length, steps, bevelEnabled: false, curveSegments: 1 });
  geometry.translate(0, 0, -length / 2);
  geometry.rotateX(Math.PI / 2); // extrusion now runs along y; the closed side faces the panel (+z)
  return geometry;
}
