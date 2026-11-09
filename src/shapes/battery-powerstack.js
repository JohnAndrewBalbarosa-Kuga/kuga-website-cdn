// Procedural stand-in: an outdoor commercial battery cabinet (Sungrow PowerStack 225 kWh style, no logos).
// Light grey powder-coated cabinet on a charcoal base, a roof cap with a small overhang, two front
// doors with handles and louvred vents, a status light, and the liquid-cooling unit's grille on the
// right side (+x, the side the resting angle turns towards the camera).
// Sizes are in metres from the datasheet (2450 H x 1150 W x 1610 D mm); fitted into a unit box later.

import * as THREE from 'three';
import { addPart, box, charcoalPlastic, darkMetal, glowing, gridBox, powderCoatGrey, roundedBox } from './mesh-helpers.js';
import { COLOURS } from '../config/theme.js';

const CABINET = { width: 1.15, height: 2.45, depth: 1.61 };
const BASE = { height: 0.1, inset: 0.03, slotWidth: 0.22, slotHeight: 0.05 }; // forklift slots front and back
const ROOF = { height: 0.06, overhang: 0.025 };
const DOOR = { gap: 0.008, margin: 0.035, proud: 0.006 };
const HANDLE = { width: 0.03, height: 0.26, depth: 0.03, y: 1.25 };
const DOOR_VENT = { width: 0.36, slats: 7, pitch: 0.04, bottom: 0.22 }; // louvres low on each door
const COOLING_GRILLE = { width: 0.95, height: 0.75, centreY: 1.65, slats: 11 }; // on the +x side
const SIDE_VENT = { width: 0.6, centreY: 0.45, slats: 6 };
const SLAT = { height: 0.012, depth: 0.02, tilt: -0.5 };
const STATUS_LIGHT = { width: 0.12, height: 0.012, y: 2.12 };
// Big flat parts are pre-cut into cells of about this size (metres), so the shatter breaks them into
// even pieces (rounded boxes gave about 17.8k sliver fragments; this gives a few thousand).
const SHATTER_CELL = 0.2;

export function buildMesh() {
  const group = new THREE.Group();
  const materials = {
    casing: powderCoatGrey(),
    door: powderCoatGrey(),
    base: charcoalPlastic(),
    dark: charcoalPlastic(),
    metal: darkMetal(),
    light: glowing(COLOURS.red, 2.4),
  };

  addBase(group, materials);
  addBody(group, materials);
  addRoof(group, materials);
  addDoors(group, materials);
  addCoolingGrille(group, materials);
  addSideVent(group, materials);
  return group;
}

function getBodyHeight() {
  return CABINET.height - BASE.height - ROOF.height;
}

// Charcoal base, set in a little, with forklift slots at the front.
function addBase(group, materials) {
  const width = CABINET.width - BASE.inset * 2;
  const depth = CABINET.depth - BASE.inset * 2;
  addPart(group, gridBox([width, BASE.height, depth], SHATTER_CELL), materials.base, [0, BASE.height / 2, 0]);
  const slot = box([BASE.slotWidth, BASE.slotHeight, 0.01]);
  [-0.27, 0.27].forEach((x) => addPart(group, slot, materials.metal, [x, BASE.slotHeight / 2 + 0.015, depth / 2 + 0.003]));
}

function addBody(group, materials) {
  const height = getBodyHeight();
  addPart(group, gridBox([CABINET.width, height, CABINET.depth], SHATTER_CELL), materials.casing, [0, BASE.height + height / 2, 0]);
}

// Flat roof cap, slightly wider than the body so rain runs off.
function addRoof(group, materials) {
  const width = CABINET.width + ROOF.overhang * 2;
  const depth = CABINET.depth + ROOF.overhang * 2;
  addPart(group, gridBox([width, ROOF.height, depth], SHATTER_CELL), materials.casing, [0, CABINET.height - ROOF.height / 2, 0]);
}

// Two doors standing just proud of the front, a dark gap between them, a handle on each.
function addDoors(group, materials) {
  const frontZ = CABINET.depth / 2;
  const doorHeight = getBodyHeight() - DOOR.margin * 2;
  const doorWidth = (CABINET.width - DOOR.margin * 2 - DOOR.gap) / 2;
  const centreY = BASE.height + DOOR.margin + doorHeight / 2;
  const door = gridBox([doorWidth, doorHeight, DOOR.proud * 2], SHATTER_CELL);
  const doorX = doorWidth / 2 + DOOR.gap / 2;

  addPart(group, gridBox([DOOR.gap * 2, doorHeight, 0.004], SHATTER_CELL), materials.dark, [0, centreY, frontZ + 0.001]);
  [-doorX, doorX].forEach((x, index) => {
    addPart(group, door, materials.door, [x, centreY, frontZ]);
    addDoorVent(group, x, frontZ + DOOR.proud, materials);
    addHandle(group, index === 0 ? -DOOR.gap / 2 - 0.07 : DOOR.gap / 2 + 0.07, frontZ + DOOR.proud, materials);
  });
  addStatusLight(group, -doorX, frontZ + DOOR.proud, materials);
}

function addHandle(group, x, z, materials) {
  const { width, height, depth, y } = HANDLE;
  addPart(group, roundedBox([width, height, depth], 0.008, 1), materials.dark, [x, y, z + depth / 2]);
  addPart(group, new THREE.CylinderGeometry(0.012, 0.012, 0.01, 12), materials.metal, [x, y - height / 2 - 0.04, z + 0.005], [Math.PI / 2, 0, 0]);
}

function addDoorVent(group, x, z, materials) {
  const { width, slats, pitch, bottom } = DOOR_VENT;
  const centreY = bottom + (slats * pitch) / 2;
  addPart(group, gridBox([width + 0.02, slats * pitch + 0.02, 0.004], SHATTER_CELL), materials.dark, [x, centreY, z + 0.002]);
  addSlats(group, { x, z: z + 0.012, bottomY: bottom + pitch / 2, count: slats, pitch, width, axis: 'z' }, materials.door);
}

function addStatusLight(group, x, z, materials) {
  const { width, height, y } = STATUS_LIGHT;
  addPart(group, roundedBox([width + 0.03, height + 0.02, 0.008], 0.004, 1), materials.dark, [x, y, z + 0.004]);
  addPart(group, box([width, height, 0.004]), materials.light, [x, y, z + 0.009]);
}

// The liquid-cooling unit: a dark recessed panel with louvres on the right side, high up.
function addCoolingGrille(group, materials) {
  const { width, height, centreY, slats } = COOLING_GRILLE;
  const sideX = CABINET.width / 2;
  addPart(group, gridBox([0.01, height + 0.04, width + 0.04], SHATTER_CELL), materials.casing, [sideX + 0.004, centreY, 0]);
  addPart(group, gridBox([0.004, height, width], SHATTER_CELL), materials.dark, [sideX + 0.01, centreY, 0]);
  const pitch = height / slats;
  addSlats(group, { x: sideX + 0.02, z: 0, bottomY: centreY - height / 2 + pitch / 2, count: slats, pitch, width, axis: 'x' }, materials.casing);
}

function addSideVent(group, materials) {
  const { width, centreY, slats } = SIDE_VENT;
  const sideX = CABINET.width / 2;
  const pitch = 0.04;
  addPart(group, gridBox([0.004, slats * pitch + 0.02, width + 0.02], SHATTER_CELL), materials.dark, [sideX + 0.002, centreY, 0]);
  addSlats(group, { x: sideX + 0.012, z: 0, bottomY: centreY - (slats * pitch) / 2 + pitch / 2, count: slats, pitch, width, axis: 'x' }, materials.casing);
}

// Angled louvre slats. axis = the direction the vent faces ('z' front, 'x' right side).
function addSlats(group, { x, z, bottomY, count, pitch, width, axis }, material) {
  const size = axis === 'z' ? [width, SLAT.height, SLAT.depth] : [SLAT.depth, SLAT.height, width];
  const slat = gridBox(size, SHATTER_CELL);
  const rotation = axis === 'z' ? [SLAT.tilt, 0, 0] : [0, 0, -SLAT.tilt];
  for (let i = 0; i < count; i += 1) {
    addPart(group, slat, material, [x, bottomY + i * pitch, z], rotation);
  }
}
