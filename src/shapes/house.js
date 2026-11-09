// Procedural stand-in: a simple modern house with solar panels on the front roof slope.

import * as THREE from 'three';
import { addPart, box, charcoalPlastic, darkGlass, whiteCasing } from './mesh-helpers.js';
import { buildSolarPanel, createPanelMaterials, getPanelSize } from './solar-panel.js';

const WALLS = { width: 1, height: 0.42, depth: 0.62 };
const ROOF = { rise: 0.22, overhang: 0.05, thickness: 0.025 };

// Roof panels: the same panel as the solar scene, scaled down. width: one panel's width in house units.
// frameStep: one extrusion step per frame bar; at this size more steps only add shatter fragments.
const ROOF_PANELS = { xs: [-0.36, -0.12, 0.12, 0.36], width: 0.22, standOff: 0.008, textureShare: 0.5, frameStep: 10 };

export function buildMesh({ textureSize = 2048 } = {}) {
  const group = new THREE.Group();
  addPart(group, box([WALLS.width, WALLS.height, WALLS.depth]), whiteCasing(), [0, WALLS.height / 2, 0]);
  addGableEnds(group);
  addRoof(group);
  addWindowsAndDoor(group);
  addSolarArray(group, textureSize);
  return group;
}

function getRoofSlope() {
  const halfDepth = WALLS.depth / 2 + ROOF.overhang;
  const angle = Math.atan2(ROOF.rise, WALLS.depth / 2);
  return { length: halfDepth / Math.cos(angle), angle };
}

// Triangular wall that fills the roof space, extruded the full width of the house.
function addGableEnds(group) {
  const shape = new THREE.Shape();
  shape.moveTo(-WALLS.depth / 2, 0);
  shape.lineTo(WALLS.depth / 2, 0);
  shape.lineTo(0, ROOF.rise);
  shape.closePath();
  const gable = new THREE.ExtrudeGeometry(shape, { depth: WALLS.width, bevelEnabled: false });
  addPart(group, gable, whiteCasing(), [-WALLS.width / 2, WALLS.height, 0], [0, Math.PI / 2, 0]);
}

// Two sloped slabs meeting at the ridge (the front slope faces the camera).
function addRoof(group) {
  const { length, angle } = getRoofSlope();
  const slab = box([WALLS.width + ROOF.overhang * 2, ROOF.thickness, length]);
  const material = charcoalPlastic();
  const y = WALLS.height + ROOF.rise / 2 + ROOF.thickness / 2;
  const z = WALLS.depth / 4;
  addPart(group, slab, material, [0, y, z], [angle, 0, 0]);
  addPart(group, slab, material, [0, y, -z], [-angle, 0, 0]);
}

function addWindowsAndDoor(group) {
  const z = WALLS.depth / 2 + 0.004;
  const glass = darkGlass();
  const windowPane = box([0.2, 0.16, 0.012]);
  addPart(group, windowPane, glass, [-0.3, 0.24, z]);
  addPart(group, windowPane, glass, [0.3, 0.24, z]);
  addPart(group, box([0.14, 0.28, 0.014]), charcoalPlastic(), [0, 0.14, z]);
  addPart(group, box([0.012, 0.22, 0.3]), glass, [WALLS.width / 2 + 0.004, 0.22, 0]);
}

// Panels lying on the front roof slope, glass facing up the slope normal. Backs are hidden by the
// roof, so they are built without junction boxes and cables (fewer shatter fragments).
function addSolarArray(group, textureSize) {
  const { angle } = getRoofSlope();
  const materials = createPanelMaterials(Math.max(512, textureSize * ROOF_PANELS.textureShare));
  const size = getPanelSize();
  const scale = ROOF_PANELS.width / size.width;
  const lift = ROOF.thickness / 2 + ROOF_PANELS.standOff + (size.depth * scale) / 2; // from the slab centre
  const y = WALLS.height + ROOF.rise / 2 + ROOF.thickness / 2 + lift * Math.cos(angle);
  const z = WALLS.depth / 4 + lift * Math.sin(angle);

  ROOF_PANELS.xs.forEach((x) => {
    const panel = buildSolarPanel(materials, { withBack: false, withRails: false, frameStep: ROOF_PANELS.frameStep });
    panel.scale.setScalar(scale);
    panel.position.set(x, y, z);
    panel.rotation.x = angle - Math.PI / 2; // +z (the glass) turns to the roof slope normal
    group.add(panel);
  });
}
