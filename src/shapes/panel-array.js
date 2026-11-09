// A field of solar panels for big roofs and carports. Every panel is the shared buildSolarPanel()
// (shapes/solar-panel.js) at small scale, without back details. One panel is built once and copied
// to every spot, then merged into one mesh per material (glass, frame, backsheet), so a roof of
// 100+ panels is three draw calls.
//
// shatterChunks: each merged mesh breaks into about this many pieces (utils/fragment-geometry.js),
// so a big array does not turn into tens of thousands of fragments.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { buildSolarPanel, getPanelSize } from './solar-panel.js';

// One extrusion step per frame bar: at this size more steps only add triangles.
const FRAME_STEP = 10;

// rows x columns panels in the XY plane, glass facing +z, centred on the origin.
// panelWidth: one panel's long side in the caller's units (panels lie in landscape, long side along x).
export function buildPanelArray(materials, { rows, columns, panelWidth, gap, shatterChunks }) {
  const piecesByMaterial = buildTemplatePieces(materials, panelWidth);
  const { stepX, stepY } = getArraySteps(panelWidth, gap);
  const group = new THREE.Group();
  const offset = new THREE.Matrix4();

  piecesByMaterial.forEach((pieces, material) => {
    const copies = [];
    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        offset.makeTranslation((column - (columns - 1) / 2) * stepX, (row - (rows - 1) / 2) * stepY, 0);
        pieces.forEach((piece) => copies.push(piece.clone().applyMatrix4(offset)));
      }
    }
    const mesh = new THREE.Mesh(mergeGeometries(copies), material);
    mesh.userData.shatterChunks = shatterChunks;
    group.add(mesh);
  });
  return group;
}

// Outer size of an array in the caller's units (for placing it on a roof).
export function getPanelArraySize({ rows, columns, panelWidth, gap }) {
  const { stepX, stepY } = getArraySteps(panelWidth, gap);
  return { width: columns * stepX - gap, height: rows * stepY - gap, depth: getPanelSize().depth * getPanelScale(panelWidth) };
}

function getPanelScale(panelWidth) {
  return panelWidth / getPanelSize().width;
}

function getArraySteps(panelWidth, gap) {
  const size = getPanelSize();
  const scale = getPanelScale(panelWidth);
  return { stepX: size.width * scale + gap, stepY: size.height * scale + gap };
}

// One small panel, its parts baked to plain geometries and grouped by material.
function buildTemplatePieces(materials, panelWidth) {
  const template = buildSolarPanel(materials, { withBack: false, withRails: false, frameStep: FRAME_STEP });
  template.scale.setScalar(getPanelScale(panelWidth));
  template.updateMatrixWorld(true);

  const piecesByMaterial = new Map();
  template.traverse((object) => {
    if (!object.isMesh) return;
    const piece = object.geometry.clone().applyMatrix4(object.matrixWorld);
    piece.clearGroups();
    if (!piecesByMaterial.has(object.material)) piecesByMaterial.set(object.material, []);
    piecesByMaterial.get(object.material).push(piece);
  });
  return piecesByMaterial;
}
