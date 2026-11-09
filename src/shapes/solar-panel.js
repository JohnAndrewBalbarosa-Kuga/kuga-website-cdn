// Procedural stand-in: a commercial monocrystalline solar panel (120 half-cut cells, 6 x 10),
// glass front facing the camera (+z), anodised frame with chamfered edges, and a real back:
// white backsheet, three junction boxes, two cables with MC4-style plugs and mounting rails.
//
// buildSolarPanel() is also used by the house roof (shapes/house.js), so the panels match.
// Sizes are in metres; the model is fitted into a unit box afterwards.

import * as THREE from 'three';
import { addPart, anodisedAluminium, backsheetWhite, charcoalPlastic, panelGlass } from './mesh-helpers.js';
import { createSolarCellTextures, getGlassSize } from './solar-cell-texture.js';
import { addPanelBack, addRail } from './solar-panel-back.js';

// 'single' = one panel on its rails (chosen: about 3.3k shatter fragments, cells read clearly).
// 'array' = three panels on a tilted ground-mount frame (about 8.4k fragments, over the ~6k budget).
const SCENE_LAYOUT = 'single';

// Cell grid in metres (M10-size cells, each cut in half). busbars: wires per cell.
export const CELL_GRID = {
  columns: 10,
  rows: 6,
  cellSize: 0.166,
  gap: 0.0025,
  centreGap: 0.012,
  border: 0.02,
  chamfer: 0.022,
  busbars: 9,
  busbarWidth: 0.0011,
  ribbonWidth: 0.005,
};

export const FRAME = {
  width: 0.03, // face width of the aluminium frame
  depth: 0.035,
  chamfer: 0.003, // bevel on every frame edge
  glassRecess: 0.0015, // glass sits just below the frame face
  backsheetInset: 0.006, // backsheet sits this far behind the frame face
};

const FRAME_STEP = 0.12; // metres per extrusion step along a frame bar

const ARRAY = {
  panels: 3,
  gap: 0.025,
  tilt: THREE.MathUtils.degToRad(22),
  frontLegHeight: 0.35,
  legSize: 0.04,
};

export function buildMesh({ textureSize = 2048 } = {}) {
  const materials = createPanelMaterials(textureSize);
  if (SCENE_LAYOUT === 'array') return buildArray(materials);
  return buildSolarPanel(materials, { withBack: true, withRails: true });
}

// New materials per build (the dissolve and shatter effects patch materials per product).
export function createPanelMaterials(textureSize) {
  const { colourMap, surfaceMap } = createSolarCellTextures(CELL_GRID, textureSize);
  return {
    glass: panelGlass(colourMap, surfaceMap),
    frame: anodisedAluminium(),
    backsheet: backsheetWhite(),
    plastic: charcoalPlastic(),
  };
}

// One panel centred on the origin, glass facing +z.
// withBack: junction boxes, cables and plugs. withRails: two mounting rails behind it.
// frameStep: metres per step along the frame bars (small panels can use one step per bar).
export function buildSolarPanel(materials, { withBack = true, withRails = false, frameStep = FRAME_STEP } = {}) {
  const glass = getGlassSize(CELL_GRID);
  const panel = new THREE.Group();
  addFrame(panel, glass, materials.frame, frameStep);
  addPart(panel, new THREE.PlaneGeometry(glass.width, glass.height), materials.glass, [0, 0, FRAME.depth / 2 - FRAME.glassRecess]);
  addBacksheet(panel, glass, materials);
  if (withBack) addPanelBack(panel, { frame: FRAME, materials });
  if (withRails) addPanelRails(panel, glass, materials);
  return panel;
}

export function getPanelSize() {
  const glass = getGlassSize(CELL_GRID);
  return { width: glass.width + FRAME.width * 2, height: glass.height + FRAME.width * 2, depth: FRAME.depth };
}

// Four bars with a chamfered profile: top and bottom run the full width, the sides fit between them
// (butt joints, like the corner keys of a real frame). Each bar is cut into short steps along its
// length so the shatter does not have to split long slivers (that tripled the fragment count).
function addFrame(panel, glass, material, step) {
  const { width } = FRAME;
  const outerWidth = glass.width + width * 2;
  const barY = glass.height / 2 + width / 2;
  const barX = glass.width / 2 + width / 2;
  [barY, -barY].forEach((y) => addPart(panel, createFrameBar(outerWidth, 'x', step), material, [0, y, 0]));
  [barX, -barX].forEach((x) => addPart(panel, createFrameBar(glass.height, 'y', step), material, [x, 0, 0]));
}

// Profile: frame depth (profile x) by face width (profile y), chamfered on all four edges.
function createFrameBar(length, axis, step) {
  const { width, depth, chamfer } = FRAME;
  const halfDepth = depth / 2;
  const halfWidth = width / 2;
  const profile = new THREE.Shape();
  profile.moveTo(-halfDepth + chamfer, -halfWidth);
  profile.lineTo(halfDepth - chamfer, -halfWidth);
  profile.lineTo(halfDepth, -halfWidth + chamfer);
  profile.lineTo(halfDepth, halfWidth - chamfer);
  profile.lineTo(halfDepth - chamfer, halfWidth);
  profile.lineTo(-halfDepth + chamfer, halfWidth);
  profile.lineTo(-halfDepth, halfWidth - chamfer);
  profile.lineTo(-halfDepth, -halfWidth + chamfer);
  profile.closePath();

  const steps = Math.max(1, Math.ceil(length / step));
  const geometry = new THREE.ExtrudeGeometry(profile, { depth: length, steps, bevelEnabled: false, curveSegments: 1 });
  geometry.translate(0, 0, -length / 2);
  geometry.rotateY(Math.PI / 2); // length along x, face width along y, depth along z
  if (axis === 'y') geometry.rotateZ(Math.PI / 2);
  return geometry;
}

// The white backsheet seen from behind, set into the frame like a tray.
function addBacksheet(panel, glass, materials) {
  const backsheet = new THREE.PlaneGeometry(glass.width, glass.height);
  const z = FRAME.depth / 2 - FRAME.backsheetInset;
  addPart(panel, backsheet, materials.backsheet, [0, 0, z], [0, Math.PI, 0]);
}

// Two rails across the back, running up the panel at the quarter points, a little longer than it.
function addPanelRails(panel, glass, materials) {
  const length = glass.height + FRAME.width * 2 + 0.12;
  const z = -FRAME.depth / 2;
  [-0.27, 0.27].forEach((share) => addRail(panel, { length, x: glass.width * share, y: 0, z, axis: 'y', material: materials.frame }));
}

// --- Three panels on a tilted ground-mount frame -------------------------------

function buildArray(materials) {
  const group = new THREE.Group();
  const size = getPanelSize();
  const rowWidth = ARRAY.panels * size.height + (ARRAY.panels - 1) * ARRAY.gap; // panels stand in portrait

  const deck = new THREE.Group();
  deck.rotation.x = -ARRAY.tilt;
  for (let i = 0; i < ARRAY.panels; i += 1) {
    const panel = buildSolarPanel(materials, { withBack: true, withRails: false });
    panel.rotation.z = Math.PI / 2;
    panel.position.x = (i - (ARRAY.panels - 1) / 2) * (size.height + ARRAY.gap);
    deck.add(panel);
  }
  const railYs = [-size.width * 0.27, size.width * 0.27];
  const railZ = -size.depth / 2;
  railYs.forEach((y) => addRail(deck, { length: rowWidth + 0.1, x: 0, y, z: railZ, axis: 'x', material: materials.frame }));
  group.add(deck);

  addArrayLegs(group, { rowWidth, railYs, railZ, materials });
  return group;
}

// Legs from each rail down to a common ground line, at both ends and the middle.
function addArrayLegs(group, { rowWidth, railYs, railZ, materials }) {
  const tilt = new THREE.Euler(-ARRAY.tilt, 0, 0);
  const railBacks = railYs.map((y) => new THREE.Vector3(0, y, railZ - 0.04).applyEuler(tilt));
  const groundY = Math.min(...railBacks.map((point) => point.y)) - ARRAY.frontLegHeight;
  const legXs = [-rowWidth / 2 + 0.15, 0, rowWidth / 2 - 0.15];
  const { legSize } = ARRAY;

  railBacks.forEach((top) => {
    const height = top.y - groundY;
    legXs.forEach((x) => {
      addPart(group, new THREE.BoxGeometry(legSize, height, legSize), materials.frame, [x, groundY + height / 2, top.z]);
      addPart(group, new THREE.BoxGeometry(legSize * 3, legSize * 0.5, legSize * 3), materials.plastic, [x, groundY, top.z]);
    });
  });
}
