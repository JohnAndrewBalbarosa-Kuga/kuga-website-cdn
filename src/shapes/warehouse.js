// Procedural stand-in: a commercial warehouse / factory, the hero of the "together" scene.
// Wide, low-pitch gable roof (ridge along x) covered in solar panels on both slopes, a precast
// concrete plinth, an office window band and entry on the left of the front (+z), a loading dock
// with three roller doors, a raised dock apron, bumpers and a canopy on the right, and rooftop
// details: two HVAC units, whirlybird vents and a ridge cap.
// Units: the house in shapes/house.js is 1 wide; this shed is about 4x that (one unit ~ 12 m).
// buildWarehouse() returns a group with the ground at y = 0, centred on x and z.

import * as THREE from 'three';
import {
  addPart,
  box,
  brushedAluminium,
  charcoalPlastic,
  concrete,
  darkGlass,
  darkMetal,
  powderCoatGrey,
  rubber,
} from './mesh-helpers.js';
import { createPanelMaterials } from './solar-panel.js';
import { buildPanelArray, getPanelArraySize } from './panel-array.js';

export const SHED = { length: 4.2, depth: 2.6, height: 0.62 };
const ROOF = { rise: 0.1, overhang: 0.05, thickness: 0.03 };
const PLINTH = { height: 0.12, proud: 0.006 };
const GUTTER = { size: 0.035 };

// Roof arrays. panelWidth: a panel's long side. shatterChunks: pieces per merged mesh (glass, frame,
// backsheet), so the two roofs together break into a few thousand pieces, not ~20k triangles.
// textureSize: the cell texture is tiny on screen here, so it is built small.
const ROOF_ARRAY = {
  panelWidth: 0.24,
  gap: 0.014,
  standOff: 0.01,
  textureSize: 512,
  shatterChunks: 380,
  front: { rows: 7, columns: 15, x: 0 },
  back: { rows: 7, columns: 12, x: -0.42 }, // shifted left, leaving room for the HVAC units
};

const OFFICE = { x: -1.25, windowWidth: 1.3, windowHeight: 0.13, windowY: 0.38, doorX: -0.45, doorSize: [0.16, 0.24] };
const DOCK = { doorXs: [0.5, 1.05, 1.6], doorSize: [0.38, 0.36], apronHeight: 0.1, apronDepth: 0.22, canopyY: 0.56, canopyDepth: 0.3 };
const HVAC = { xs: [1.5, 1.88], z: -0.6, size: [0.28, 0.12, 0.22], fanRadius: 0.05 };
const VENTS = { xs: [-1.6, -0.8, 0, 0.8, 1.6], radius: 0.03, height: 0.04 };

export function buildWarehouse({ textureSize = 2048 } = {}) {
  const group = new THREE.Group();
  const materials = {
    wall: powderCoatGrey(),
    roof: charcoalPlastic(),
    trim: charcoalPlastic(),
    concrete: concrete(),
    glass: darkGlass(),
    door: darkMetal(),
    metal: brushedAluminium(),
    rubber: rubber(),
  };
  addShell(group, materials);
  addRoof(group, materials);
  addOffice(group, materials);
  addLoadingDock(group, materials);
  addRoofArrays(group, Math.min(textureSize, ROOF_ARRAY.textureSize));
  addRooftopDetails(group, materials);
  return group;
}

function getRoofSlope() {
  const halfDepth = SHED.depth / 2 + ROOF.overhang;
  const angle = Math.atan2(ROOF.rise, SHED.depth / 2);
  return { length: halfDepth / Math.cos(angle), angle };
}

// Height of the roof's top surface at a given z (for things standing on it).
function getRoofTopY(z) {
  const share = 1 - Math.min(1, Math.abs(z) / (SHED.depth / 2));
  return SHED.height + ROOF.rise * share + ROOF.thickness / 2;
}

function addShell(group, materials) {
  const { length, depth, height } = SHED;
  addPart(group, box([length, height, depth]), materials.wall, [0, height / 2, 0]);
  const plinth = box([length + PLINTH.proud * 2, PLINTH.height, depth + PLINTH.proud * 2]);
  addPart(group, plinth, materials.concrete, [0, PLINTH.height / 2, 0]);
  addGableEnds(group, materials.wall);
}

// Triangular wall filling the roof space, extruded the full length of the shed.
function addGableEnds(group, material) {
  const shape = new THREE.Shape();
  shape.moveTo(-SHED.depth / 2, 0);
  shape.lineTo(SHED.depth / 2, 0);
  shape.lineTo(0, ROOF.rise);
  shape.closePath();
  const gable = new THREE.ExtrudeGeometry(shape, { depth: SHED.length, bevelEnabled: false });
  addPart(group, gable, material, [-SHED.length / 2, SHED.height, 0], [0, Math.PI / 2, 0]);
}

// Two sloped slabs meeting at the ridge, gutters along both eaves and a ridge cap.
function addRoof(group, materials) {
  const { length, angle } = getRoofSlope();
  const width = SHED.length + ROOF.overhang * 2;
  const slab = box([width, ROOF.thickness, length]);
  const y = SHED.height + ROOF.rise / 2 + ROOF.thickness / 2;
  const z = SHED.depth / 4;
  addPart(group, slab, materials.roof, [0, y, z], [angle, 0, 0]);
  addPart(group, slab, materials.roof, [0, y, -z], [-angle, 0, 0]);

  const gutter = box([width, GUTTER.size, GUTTER.size]);
  const gutterZ = SHED.depth / 2 + ROOF.overhang - GUTTER.size / 2;
  [gutterZ, -gutterZ].forEach((gz) => addPart(group, gutter, materials.trim, [0, SHED.height - GUTTER.size / 4, gz]));
  addPart(group, box([width, 0.015, 0.09]), materials.trim, [0, SHED.height + ROOF.rise + ROOF.thickness, 0]);
}

// Office on the left of the front: a long window band and a glazed entry under a small awning.
function addOffice(group, materials) {
  const z = SHED.depth / 2 + 0.006;
  addPart(group, box([OFFICE.windowWidth, OFFICE.windowHeight, 0.012]), materials.glass, [OFFICE.x, OFFICE.windowY, z]);
  const [doorWidth, doorHeight] = OFFICE.doorSize;
  addPart(group, box([doorWidth, doorHeight, 0.014]), materials.glass, [OFFICE.doorX, doorHeight / 2, z]);
  addPart(group, box([doorWidth * 2, 0.012, 0.1]), materials.trim, [OFFICE.doorX, doorHeight + 0.03, z + 0.05]);
}

// Loading dock on the right of the front: roller doors at truck-bed height above a concrete apron,
// a roller housing over each door, rubber bumpers on the apron face and a canopy over the lot.
function addLoadingDock(group, materials) {
  const z = SHED.depth / 2;
  const [doorWidth, doorHeight] = DOCK.doorSize;
  const xs = DOCK.doorXs;
  const centreX = (xs[0] + xs[xs.length - 1]) / 2;
  const spanX = xs[xs.length - 1] - xs[0] + doorWidth + 0.2;
  const doorY = DOCK.apronHeight + doorHeight / 2;

  addPart(group, box([spanX, DOCK.apronHeight, DOCK.apronDepth]), materials.concrete, [centreX, DOCK.apronHeight / 2, z + DOCK.apronDepth / 2]);
  xs.forEach((x) => {
    addPart(group, box([doorWidth, doorHeight, 0.012]), materials.door, [x, doorY, z + 0.006]);
    addPart(group, box([doorWidth + 0.04, 0.04, 0.04]), materials.trim, [x, doorY + doorHeight / 2 + 0.02, z + 0.02]);
    [-0.14, 0.14].forEach((dx) => {
      addPart(group, box([0.03, 0.05, 0.025]), materials.rubber, [x + dx, DOCK.apronHeight * 0.6, z + DOCK.apronDepth + 0.0125]);
    });
  });
  addPart(group, box([spanX + 0.1, 0.016, DOCK.canopyDepth]), materials.trim, [centreX, DOCK.canopyY, z + DOCK.canopyDepth / 2]);
}

// Panels lying on both roof slopes, glass along the slope normal.
function addRoofArrays(group, textureSize) {
  const panelMaterials = createPanelMaterials(textureSize);
  const { angle } = getRoofSlope();
  const settings = { panelWidth: ROOF_ARRAY.panelWidth, gap: ROOF_ARRAY.gap, shatterChunks: ROOF_ARRAY.shatterChunks };

  [
    { ...ROOF_ARRAY.front, side: 1 },
    { ...ROOF_ARRAY.back, side: -1 },
  ].forEach(({ rows, columns, x, side }) => {
    const array = buildPanelArray(panelMaterials, { ...settings, rows, columns });
    const { depth } = getPanelArraySize({ ...settings, rows, columns });
    const lift = ROOF.thickness / 2 + ROOF_ARRAY.standOff + depth / 2; // from the slab centre, along its normal
    array.position.set(
      x,
      SHED.height + ROOF.rise / 2 + ROOF.thickness / 2 + lift * Math.cos(angle),
      side * (SHED.depth / 4 + lift * Math.sin(angle)),
    );
    array.rotation.x = side > 0 ? angle - Math.PI / 2 : -angle - Math.PI / 2; // +z (the glass) turns to the slope normal
    group.add(array);
  });
}

// Two HVAC units with fans on the back slope, whirlybird vents along the ridge.
function addRooftopDetails(group, materials) {
  const [width, height, depth] = HVAC.size;
  const baseY = getRoofTopY(HVAC.z - depth / 2);
  HVAC.xs.forEach((x) => {
    addPart(group, box([width, height, depth]), materials.wall, [x, baseY + height / 2, HVAC.z]);
    [-width / 4, width / 4].forEach((dx) => {
      const fan = new THREE.CylinderGeometry(HVAC.fanRadius, HVAC.fanRadius, 0.012, 12);
      addPart(group, fan, materials.door, [x + dx, baseY + height + 0.006, HVAC.z]);
    });
  });

  const ridgeY = SHED.height + ROOF.rise + ROOF.thickness;
  VENTS.xs.forEach((x) => {
    const stem = new THREE.CylinderGeometry(VENTS.radius * 0.6, VENTS.radius * 0.6, VENTS.height, 8, 1, true);
    addPart(group, stem, materials.metal, [x, ridgeY + VENTS.height / 2, 0]);
    const head = new THREE.SphereGeometry(VENTS.radius, 8, 4);
    addPart(group, head, materials.metal, [x, ridgeY + VENTS.height + VENTS.radius * 0.5, 0]);
  });
}
