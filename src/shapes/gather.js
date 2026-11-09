// Particles gathering round a pill-shaped button (data-shape="gather").
// Width is 1 unit; height follows the button's aspect ratio (width / height).

import { buildPointsFromParts, randomBetween } from './shape-helpers.js';

export function createGatherPoints(count, aspect = 3) {
  const height = 1 / Math.max(aspect, 1);
  const radius = height / 2;
  const straight = 1 - height;
  const perimeter = 2 * straight + 2 * Math.PI * radius;

  const sampleOutline = () => pointNearPill({ radius, straight, perimeter, spread: 0.04 });
  const sampleHalo = () => pointNearPill({ radius, straight, perimeter, spread: 0.35 });

  return buildPointsFromParts(count, [
    { weight: 0.6, sample: sampleOutline },
    { weight: 0.4, sample: sampleHalo },
  ]);
}

// Walks a random distance round the pill outline, then pushes outward.
function pointNearPill({ radius, straight, perimeter, spread }) {
  const distance = Math.random() * perimeter;
  const push = Math.abs(randomBetween(-1, 1) * randomBetween(0, 1)) * spread;
  const z = randomBetween(-0.03, 0.03);
  const halfStraight = straight / 2;

  if (distance < straight) {
    return [-halfStraight + distance, radius + push, z];
  }
  if (distance < straight * 2) {
    return [halfStraight - (distance - straight), -radius - push, z];
  }

  const arcDistance = distance - straight * 2;
  const isRightEnd = arcDistance < Math.PI * radius;
  const angle = (isRightEnd ? arcDistance : arcDistance - Math.PI * radius) / radius;
  const r = radius + push;
  if (isRightEnd) {
    return [halfStraight + Math.sin(angle) * r, Math.cos(angle) * r, z];
  }
  return [-halfStraight - Math.sin(angle) * r, -Math.cos(angle) * r, z];
}
