// Particles that spell a word. The word comes from data-shape-text on the section.
// Draws the text on a hidden 2D canvas and samples the filled pixels.

import { randomBetween, createCloudPoints } from './shape-helpers.js';

const FONT_SIZE = 180;
const FONT = `800 ${FONT_SIZE}px "Suisse Int'l", Inter, "Helvetica Neue", Arial, sans-serif`;

export function createLogoTextPoints(count, text) {
  const word = (text || '').trim();
  if (!word) return createCloudPoints(count);

  const canvas = drawWord(word);
  const filledPixels = findFilledPixels(canvas);
  if (filledPixels.length === 0) return createCloudPoints(count);

  return samplePixels(filledPixels, count, canvas.width, canvas.height);
}

function drawWord(word) {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  context.font = FONT;
  const textWidth = context.measureText(word).width;

  canvas.width = Math.ceil(textWidth + FONT_SIZE * 0.4);
  canvas.height = Math.ceil(FONT_SIZE * 1.4);

  // Resizing a canvas resets its state, so set the font again.
  context.font = FONT;
  context.fillStyle = '#fff';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(word, canvas.width / 2, canvas.height / 2);
  return canvas;
}

function findFilledPixels(canvas) {
  const context = canvas.getContext('2d');
  const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
  const filled = [];
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 128) continue;
    const pixel = i / 4;
    filled.push(pixel % canvas.width, Math.floor(pixel / canvas.width));
  }
  return filled;
}

function samplePixels(filledPixels, count, width, height) {
  const points = new Float32Array(count * 3);
  const pixelCount = filledPixels.length / 2;
  for (let i = 0; i < count; i += 1) {
    const pick = Math.floor(Math.random() * pixelCount) * 2;
    const x = filledPixels[pick] + Math.random();
    const y = filledPixels[pick + 1] + Math.random();
    points[i * 3] = (x - width / 2) / width;
    points[i * 3 + 1] = (height / 2 - y) / width;
    points[i * 3 + 2] = randomBetween(-0.03, 0.03);
  }
  return points;
}
