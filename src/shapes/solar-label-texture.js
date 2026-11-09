// Canvas texture for the rating label on the back of the solar panel: a heading bar, grey text
// lines and a barcode. Generic on purpose (no maker's name or logo).

import * as THREE from 'three';

const SIZE = { width: 256, height: 154 };
const INK = '#5A5F66';

export function createLabelTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = SIZE.width;
  canvas.height = SIZE.height;
  const context = canvas.getContext('2d');

  context.fillStyle = '#FAFAFA';
  context.fillRect(0, 0, SIZE.width, SIZE.height);
  context.fillStyle = INK;
  context.fillRect(12, 12, 150, 12);
  drawTextLines(context);
  drawBarcode(context, 12, 112, 150, 30);
  context.strokeStyle = '#C7CBD0';
  context.lineWidth = 2;
  context.strokeRect(1, 1, SIZE.width - 2, SIZE.height - 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function drawTextLines(context) {
  context.fillStyle = '#9AA0A7';
  const widths = [210, 180, 196, 150, 172];
  widths.forEach((width, row) => context.fillRect(12, 36 + row * 14, width, 5));
}

function drawBarcode(context, x, y, width, height) {
  context.fillStyle = INK;
  let position = x;
  while (position < x + width) {
    const bar = 1 + Math.floor(Math.random() * 3);
    context.fillRect(position, y, bar, height);
    position += bar + 1 + Math.floor(Math.random() * 3);
  }
}
