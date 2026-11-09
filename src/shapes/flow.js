// "Flowing energy": a few wavy ribbons across the screen.
// Used by data-shape="flow" (the hero breaking apart).

import { buildPointsFromParts, randomBetween } from './shape-helpers.js';

const RIBBON_COUNT = 5;

export function createFlowPoints(count) {
  return buildPointsFromParts(count, [{ weight: 1, sample: sampleRibbonPoint }]);
}

function sampleRibbonPoint() {
  const ribbon = Math.floor(Math.random() * RIBBON_COUNT);
  const x = randomBetween(-0.5, 0.5);
  const wave = Math.sin(x * 9 + ribbon * 1.3) * 0.06;
  const lane = (ribbon - (RIBBON_COUNT - 1) / 2) * 0.05;
  const y = wave + lane + randomBetween(-0.012, 0.012);
  const z = Math.cos(x * 6 + ribbon) * 0.08 + randomBetween(-0.02, 0.02);
  return [x, y, z];
}
