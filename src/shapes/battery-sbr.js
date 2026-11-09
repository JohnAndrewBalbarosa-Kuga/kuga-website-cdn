// Procedural stand-in: a stackable high-voltage home/small-site battery (Sungrow SBR style, no logos).
// A charcoal base plinth, five 3.2 kWh modules stacked on it, and the control unit (BMU) on top
// with a thin status light strip. Thin dark seams show between the modules.
//
// Every mesh carries userData.stackLayer (0 = plinth, then each module, then the control unit),
// so the solid model controller can land the layers one on top of another (STACK_LANDING in theme.js).
// Sizes are in metres from the datasheet; the model is fitted into a unit box afterwards.

import * as THREE from 'three';
import { addPart, box, charcoalPlastic, darkGlass, glowing, roundedBox, rubber, whiteCasing } from './mesh-helpers.js';
import { COLOURS } from '../config/theme.js';

const MODULE_COUNT = 5; // SBR160 = 5 modules (about 805 mm tall); SBR096 = 3

// One battery module: 625 W x 130 H x 330 D mm. seam: the dark gap under each module.
const MODULE = { width: 0.625, height: 0.13, depth: 0.33, radius: 0.012, seam: 0.005 };
const CONTROL_UNIT = { height: 0.105, radius: 0.018 };
const PLINTH = { height: 0.05, inset: 0.02 };
const HANDLE = { width: 0.006, height: 0.026, depth: 0.15 }; // dark grip slot on each side of a module
const LIGHT_STRIP = { width: 0.2, height: 0.005, windowWidth: 0.26, windowHeight: 0.02 };
const BOX_SEGMENTS = 2; // rounded-box segments; every triangle becomes a shatter fragment

export function buildMesh() {
  const group = new THREE.Group();
  const materials = {
    casing: whiteCasing(),
    seam: charcoalPlastic(),
    plinth: charcoalPlastic(),
    glass: darkGlass(),
    light: glowing(COLOURS.red, 2.4),
    feet: rubber(),
  };

  let layer = 0;
  let y = 0;
  addLayer(group, layer, (part) => addPlinth(part, materials));
  y += PLINTH.height;

  for (let i = 0; i < MODULE_COUNT; i += 1) {
    layer += 1;
    const bottom = y;
    addLayer(group, layer, (part) => addModule(part, bottom, materials));
    y += MODULE.height;
  }

  layer += 1;
  const top = y;
  addLayer(group, layer, (part) => addControlUnit(part, top, materials));
  return group;
}

// Builds one stack layer in its own group and tags all its meshes with the layer number.
function addLayer(group, layer, build) {
  const part = new THREE.Group();
  build(part);
  part.traverse((object) => {
    if (object.isMesh) object.userData.stackLayer = layer;
  });
  group.add(part);
}

// Recessed charcoal base with four low feet.
function addPlinth(part, materials) {
  const width = MODULE.width - PLINTH.inset * 2;
  const depth = MODULE.depth - PLINTH.inset * 2;
  const bodyHeight = PLINTH.height * 0.7;
  addPart(part, roundedBox([width, bodyHeight, depth], 0.006, 1), materials.plinth, [0, PLINTH.height - bodyHeight / 2, 0]);

  const footHeight = PLINTH.height - bodyHeight;
  const foot = new THREE.CylinderGeometry(0.022, 0.026, footHeight, 12);
  const x = width / 2 - 0.05;
  const z = depth / 2 - 0.05;
  [[-x, -z], [x, -z], [-x, z], [x, z]].forEach(([fx, fz]) => addPart(part, foot, materials.feet, [fx, footHeight / 2, fz]));
}

// A module sits on a thin dark seam; grip slots on both sides.
function addModule(part, bottom, materials) {
  const { width, height, depth, radius, seam } = MODULE;
  addSeam(part, bottom, materials);
  const bodyHeight = height - seam;
  addPart(part, roundedBox([width, bodyHeight, depth], radius, BOX_SEGMENTS), materials.casing, [0, bottom + seam + bodyHeight / 2, 0]);
  addHandles(part, bottom + seam + bodyHeight / 2, materials);
}

// Slightly smaller than the casing, so it reads as a dark line between the white modules.
function addSeam(part, bottom, materials) {
  const { width, depth, seam } = MODULE;
  addPart(part, box([width - 0.01, seam, depth - 0.01]), materials.seam, [0, bottom + seam / 2, 0]);
}

function addHandles(part, y, materials) {
  const slot = roundedBox([HANDLE.width, HANDLE.height, HANDLE.depth], 0.0025, 1);
  const x = MODULE.width / 2 + HANDLE.width / 2 - 0.002;
  [-x, x].forEach((handleX) => addPart(part, slot, materials.seam, [handleX, y, 0]));
}

// Control unit on top: rounder casing, a dark window with the status light strip in it.
function addControlUnit(part, bottom, materials) {
  const { width, depth, seam } = MODULE;
  addSeam(part, bottom, materials);
  const bodyHeight = CONTROL_UNIT.height - seam;
  const centreY = bottom + seam + bodyHeight / 2;
  addPart(part, roundedBox([width, bodyHeight, depth], CONTROL_UNIT.radius, BOX_SEGMENTS), materials.casing, [0, centreY, 0]);

  const frontZ = depth / 2;
  const lightWindow = roundedBox([LIGHT_STRIP.windowWidth, LIGHT_STRIP.windowHeight, 0.004], 0.003, 1);
  addPart(part, lightWindow, materials.glass, [0, centreY, frontZ]);
  addPart(part, box([LIGHT_STRIP.width, LIGHT_STRIP.height, 0.002]), materials.light, [0, centreY, frontZ + 0.0025]);
  addHandles(part, centreY, materials);
}
