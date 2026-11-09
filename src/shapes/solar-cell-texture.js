// Canvas textures for the front of a solar panel: half-cut monocrystalline cells with their
// chamfered corners, fine fingers, silver busbars running along each string, bus ribbons at the
// ends and the white backsheet showing between cells.
//
// Two textures are drawn from the same layout:
//   colourMap   what you see (sRGB)
//   surfaceMap  roughness in green, metalness in blue (three.js convention), so the busbars
//               read as metal and the backsheet as matt plastic under the glass
//
// The grid is described in metres (see CELL_GRID in shapes/solar-panel.js); getGlassSize() gives
// the glass size that grid needs, so cells stay square at any texture size.

import * as THREE from 'three';

const COLOURS = {
  backsheet: '#E4E7EB',
  cellLight: '#131D36',
  cellDark: '#04070F',
  finger: 'rgba(150, 165, 190, 0.07)',
  busbar: '#C3C8CF',
  ribbon: '#D2D6DB',
};

// Roughness (green) and metalness (blue) for each part, 0..255.
const SURFACE = {
  backsheet: 'rgb(0, 190, 0)',
  cellLight: 'rgb(0, 115, 20)',
  cellDark: 'rgb(0, 115, 20)',
  finger: 'rgba(0, 80, 255, 0.07)',
  busbar: 'rgb(0, 70, 255)',
  ribbon: 'rgb(0, 80, 255)',
};

const CELL_SHADE_VARIATION = 0.06; // mono cells differ slightly in tone
const FINGER_SPACING = 0.004; // metres between fingers

export function getGlassSize(grid) {
  const { columns, rows, cellSize, gap, centreGap, border } = grid;
  return {
    width: border * 2 + columns * cellSize + (columns - 1) * gap + (centreGap - gap),
    height: border * 2 + rows * cellSize + (rows - 1) * gap,
  };
}

// width: texture width in pixels (the quality tier's textureSize).
export function createSolarCellTextures(grid, width) {
  const glass = getGlassSize(grid);
  const pixelsPerMetre = width / glass.width;
  const height = Math.round(glass.height * pixelsPerMetre);
  const shades = createCellShades(grid);

  const colourCanvas = drawPanelFace({ grid, width, height, pixelsPerMetre, palette: COLOURS, shades });
  const surfaceCanvas = drawPanelFace({ grid, width, height, pixelsPerMetre, palette: SURFACE, shades: null });
  return {
    colourMap: asTexture(colourCanvas, THREE.SRGBColorSpace),
    surfaceMap: asTexture(surfaceCanvas, THREE.NoColorSpace),
  };
}

function createCellShades({ columns, rows }) {
  return Array.from({ length: columns * rows }, () => 1 + (Math.random() - 0.5) * 2 * CELL_SHADE_VARIATION);
}

function drawPanelFace({ grid, width, height, pixelsPerMetre, palette, shades }) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  context.scale(pixelsPerMetre, pixelsPerMetre); // draw in metres from here on
  const thinLine = 1 / pixelsPerMetre; // one pixel, so lines never vanish on small textures

  context.fillStyle = palette.backsheet;
  context.fillRect(0, 0, width / pixelsPerMetre, height / pixelsPerMetre);
  forEachCell(grid, (x, y, index) => drawCell(context, { grid, x, y, palette, thinLine, shade: shades ? shades[index] : 1 }));
  forEachCell(grid, (x, y) => drawHalfCut(context, { grid, x, y, palette, thinLine }));
  drawBusbars(context, { grid, palette, thinLine });
  drawEndRibbons(context, { grid, palette });
  return canvas;
}

function forEachCell(grid, draw) {
  for (let row = 0; row < grid.rows; row += 1) {
    for (let column = 0; column < grid.columns; column += 1) {
      draw(getCellX(grid, column), getCellY(grid, row), row * grid.columns + column);
    }
  }
}

function getCellX({ border, cellSize, gap, centreGap, columns }, column) {
  const pastCentre = column >= columns / 2 ? centreGap - gap : 0;
  return border + column * (cellSize + gap) + pastCentre;
}

function getCellY({ border, cellSize, gap }, row) {
  return border + row * (cellSize + gap);
}

// Pseudo-square mono cell: square with chamfered corners, a soft diagonal tone and fine fingers.
function drawCell(context, { grid, x, y, palette, thinLine, shade }) {
  const { cellSize: size, chamfer } = grid;
  context.save();
  traceChamferedSquare(context, x, y, size, chamfer);
  context.fillStyle = createCellGradient(context, x, y, size, palette, shade);
  context.fill();
  context.clip();
  context.fillStyle = palette.finger;
  for (let fingerX = x + FINGER_SPACING / 2; fingerX < x + size; fingerX += FINGER_SPACING) {
    context.fillRect(fingerX, y, thinLine, size);
  }
  context.restore();
}

function traceChamferedSquare(context, x, y, size, chamfer) {
  context.beginPath();
  context.moveTo(x + chamfer, y);
  context.lineTo(x + size - chamfer, y);
  context.lineTo(x + size, y + chamfer);
  context.lineTo(x + size, y + size - chamfer);
  context.lineTo(x + size - chamfer, y + size);
  context.lineTo(x + chamfer, y + size);
  context.lineTo(x, y + size - chamfer);
  context.lineTo(x, y + chamfer);
  context.closePath();
}

function createCellGradient(context, x, y, size, palette, shade) {
  if (palette.cellLight === palette.cellDark) return palette.cellLight;
  const gradient = context.createLinearGradient(x, y, x + size, y + size);
  gradient.addColorStop(0, scaleColour(palette.cellLight, shade));
  gradient.addColorStop(1, scaleColour(palette.cellDark, shade));
  return gradient;
}

// Each cell is cut in half across its busbars; the backsheet shows through the cut.
function drawHalfCut(context, { grid, x, y, palette, thinLine }) {
  const cutWidth = Math.max(grid.gap * 0.5, thinLine);
  context.fillStyle = palette.backsheet;
  context.fillRect(x + grid.cellSize / 2 - cutWidth / 2, y, cutWidth, grid.cellSize);
}

// Busbars run along each string, over the cells and across the gaps between them,
// stopping at the centre gap (the two halves of a half-cut panel are wired separately).
function drawBusbars(context, { grid, palette, thinLine }) {
  const { columns, rows, cellSize, busbars, busbarWidth } = grid;
  const halfColumns = columns / 2;
  const left = { from: getCellX(grid, 0), to: getCellX(grid, halfColumns - 1) + cellSize };
  const right = { from: getCellX(grid, halfColumns), to: getCellX(grid, columns - 1) + cellSize };
  const lineWidth = Math.max(busbarWidth, thinLine);
  context.fillStyle = palette.busbar;

  for (let row = 0; row < rows; row += 1) {
    const top = getCellY(grid, row);
    for (let bar = 1; bar <= busbars; bar += 1) {
      const barY = top + (cellSize * bar) / (busbars + 1) - lineWidth / 2;
      [left, right].forEach(({ from, to }) => context.fillRect(from, barY, to - from, lineWidth));
    }
  }
}

// Wide ribbons in the border and beside the centre gap tie the strings together.
function drawEndRibbons(context, { grid, palette }) {
  const { columns, rows, cellSize, border, ribbonWidth } = grid;
  const top = getCellY(grid, 0);
  const bottom = getCellY(grid, rows - 1) + cellSize;
  const halfColumns = columns / 2;
  const xs = [
    border * 0.5,
    getCellX(grid, halfColumns - 1) + cellSize + ribbonWidth * 0.6,
    getCellX(grid, halfColumns) - ribbonWidth * 1.6,
    getCellX(grid, columns - 1) + cellSize + border * 0.5 - ribbonWidth,
  ];
  context.fillStyle = palette.ribbon;
  xs.forEach((x) => context.fillRect(x, top, ribbonWidth, bottom - top));
}

function scaleColour(hex, factor) {
  const colour = new THREE.Color(hex).multiplyScalar(factor);
  return `#${colour.getHexString()}`;
}

function asTexture(canvas, colorSpace) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = colorSpace;
  texture.anisotropy = 8;
  return texture;
}
