// Procedural stand-in: a solar carport over a row of parking bays, with EV chargers at the head of
// the bays. A single-row T-frame (posts down the middle, two beams under a slightly tilted canopy),
// the canopy covered by a small panel array, an asphalt pad and white bay lines.
// Units match shapes/warehouse.js (one unit ~ 12 m). Ground at y = 0, centred on x and z.
// The cars nose in towards -z, where the chargers stand.

import * as THREE from 'three';
import { COLOURS } from '../config/theme.js';
import { addPart, asphalt, box, brushedAluminium, darkGlass, glowing, whiteCasing } from './mesh-helpers.js';
import { createPanelMaterials } from './solar-panel.js';
import { buildPanelArray } from './panel-array.js';

export const BAYS = { count: 4, width: 0.24, depth: 0.46 };
const CANOPY = { height: 0.24, tilt: THREE.MathUtils.degToRad(6), overhang: 0.04, beamSize: 0.03 };
const CANOPY_ARRAY = { rows: 4, columns: 6, panelWidth: 0.16, gap: 0.01, textureSize: 512, shatterChunks: 70 };
const POST = { size: 0.03 };
const PAD = { margin: 0.06, thickness: 0.01, frontExtra: 0.2 };
const LINE = { width: 0.008, length: 0.36 };
const CHARGER = { size: [0.035, 0.11, 0.025], xs: [-0.24, 0.24], z: -0.2 };

export function buildSolarCarport({ textureSize = 2048 } = {}) {
  const group = new THREE.Group();
  const materials = { frame: brushedAluminium(), pad: asphalt(), line: whiteCasing() };
  addPad(group, materials);
  addFrame(group, materials);
  addCanopy(group, materials, Math.min(textureSize, CANOPY_ARRAY.textureSize));
  CHARGER.xs.forEach((x) => addCharger(group, x));
  return group;
}

function getCanopySize() {
  return { width: BAYS.count * BAYS.width + CANOPY.overhang * 2, depth: BAYS.depth + CANOPY.overhang * 2 };
}

// Asphalt pad (a little longer at the front, the driving aisle) and the bay lines on it.
function addPad(group, materials) {
  const { width, depth } = getCanopySize();
  const padDepth = depth + PAD.frontExtra;
  addPart(group, box([width + PAD.margin * 2, PAD.thickness, padDepth]), materials.pad, [0, PAD.thickness / 2, PAD.frontExtra / 2]);
  for (let i = 0; i <= BAYS.count; i += 1) {
    const x = (i - BAYS.count / 2) * BAYS.width;
    addPart(group, box([LINE.width, PAD.thickness * 0.4, LINE.length]), materials.line, [x, PAD.thickness + 0.001, 0.02]);
  }
}

// Posts down the middle of the bays, carrying two beams under the canopy.
function addFrame(group, materials) {
  const { width } = getCanopySize();
  const postXs = [-width / 2 + 0.08, 0, width / 2 - 0.08];
  postXs.forEach((x) => addPart(group, box([POST.size, CANOPY.height, POST.size]), materials.frame, [x, CANOPY.height / 2, -BAYS.depth * 0.35]));
  addPart(group, box([width, CANOPY.beamSize, CANOPY.beamSize]), materials.frame, [0, CANOPY.height, -BAYS.depth * 0.35]);
}

// Panel array tilted a few degrees towards the front (+z), resting on a second beam.
function addCanopy(group, materials, textureSize) {
  const array = buildPanelArray(createPanelMaterials(textureSize), CANOPY_ARRAY);
  array.position.set(0, CANOPY.height + CANOPY.beamSize, 0);
  array.rotation.x = CANOPY.tilt - Math.PI / 2; // glass up, leaning towards +z
  group.add(array);
  const { width } = getCanopySize();
  addPart(group, box([width, CANOPY.beamSize * 0.8, CANOPY.beamSize]), materials.frame, [0, CANOPY.height + CANOPY.beamSize * 0.5, BAYS.depth * 0.15]);
}

// A slim charging pedestal facing the bay: white body, dark screen, a Kuga-red status strip.
function addCharger(group, x) {
  const [width, height, depth] = CHARGER.size;
  const front = CHARGER.z + depth / 2;
  addPart(group, box([width, height, depth]), whiteCasing(), [x, height / 2, CHARGER.z]);
  addPart(group, box([width * 0.7, height * 0.18, 0.004]), darkGlass(), [x, height * 0.78, front + 0.002]);
  addPart(group, box([width * 0.16, height * 0.4, 0.003]), glowing(COLOURS.red, 2), [x, height * 0.42, front + 0.0015]);
}
