// Shared building blocks for the procedural stand-in shapes.
// Every sampler returns one point as [x, y, z]. Shapes are built around the origin
// and should fit inside a box whose largest side is about 1 unit.

export function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

// Splits `count` points across parts by weight and fills one Float32Array.
export function buildPointsFromParts(count, parts) {
  const points = new Float32Array(count * 3);
  const totalWeight = parts.reduce((sum, part) => sum + part.weight, 0);
  let written = 0;

  parts.forEach((part, partIndex) => {
    const isLastPart = partIndex === parts.length - 1;
    const share = Math.round((count * part.weight) / totalWeight);
    const partCount = isLastPart ? count - written : Math.min(share, count - written);
    for (let i = 0; i < partCount; i += 1) {
      points.set(part.sample(), (written + i) * 3);
    }
    written += partCount;
  });

  return points;
}

export function offsetPoint(point, offset) {
  return [point[0] + offset[0], point[1] + offset[1], point[2] + offset[2]];
}

export function rotatePointX(point, angle) {
  const [x, y, z] = point;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return [x, y * cos - z * sin, y * sin + z * cos];
}

export function pointInBox(size, centre = [0, 0, 0]) {
  return offsetPoint(
    [randomBetween(-0.5, 0.5) * size[0], randomBetween(-0.5, 0.5) * size[1], randomBetween(-0.5, 0.5) * size[2]],
    centre,
  );
}

// Random point on the outside of a box, weighted by face area.
export function pointOnBoxSurface(size, centre = [0, 0, 0]) {
  const [w, h, d] = size;
  const frontArea = w * h;
  const topArea = w * d;
  const sideArea = h * d;
  const pick = Math.random() * (frontArea + topArea + sideArea);
  const sign = Math.random() < 0.5 ? -0.5 : 0.5;
  const u = randomBetween(-0.5, 0.5);
  const v = randomBetween(-0.5, 0.5);

  if (pick < frontArea) return offsetPoint([u * w, v * h, sign * d], centre);
  if (pick < frontArea + topArea) return offsetPoint([u * w, sign * h, v * d], centre);
  return offsetPoint([sign * w, u * h, v * d], centre);
}

// Random point on one of the 12 edges of a box.
export function pointOnBoxEdges(size, centre = [0, 0, 0]) {
  const [w, h, d] = size;
  const axis = Math.floor(Math.random() * 3);
  const a = Math.random() < 0.5 ? -0.5 : 0.5;
  const b = Math.random() < 0.5 ? -0.5 : 0.5;
  const t = randomBetween(-0.5, 0.5);

  if (axis === 0) return offsetPoint([t * w, a * h, b * d], centre);
  if (axis === 1) return offsetPoint([a * w, t * h, b * d], centre);
  return offsetPoint([a * w, b * h, t * d], centre);
}

export function pointOnLine(start, end, jitter = 0) {
  const t = Math.random();
  return [
    start[0] + (end[0] - start[0]) * t + randomBetween(-jitter, jitter),
    start[1] + (end[1] - start[1]) * t + randomBetween(-jitter, jitter),
    start[2] + (end[2] - start[2]) * t + randomBetween(-jitter, jitter),
  ];
}

// Random point along a chain of connected points.
export function pointOnPolyline(corners, jitter = 0) {
  const segment = Math.floor(Math.random() * (corners.length - 1));
  return pointOnLine(corners[segment], corners[segment + 1], jitter);
}

// Grid lines on a flat rectangle facing +z (like solar cells).
export function pointOnRectGrid({ width, height, columns, rows, centre = [0, 0, 0] }) {
  const useColumnLine = Math.random() < 0.5;
  if (useColumnLine) {
    const column = Math.floor(Math.random() * (columns + 1));
    const x = (column / columns - 0.5) * width;
    return offsetPoint([x, randomBetween(-0.5, 0.5) * height, 0], centre);
  }
  const row = Math.floor(Math.random() * (rows + 1));
  const y = (row / rows - 0.5) * height;
  return offsetPoint([randomBetween(-0.5, 0.5) * width, y, 0], centre);
}

// Circle in a plane. axis = the direction the circle faces ('x', 'y' or 'z').
export function pointOnRing({ radius, thickness = 0, centre = [0, 0, 0], axis = 'z' }) {
  const angle = Math.random() * Math.PI * 2;
  const r = radius + randomBetween(-thickness, thickness);
  const a = Math.cos(angle) * r;
  const b = Math.sin(angle) * r;
  if (axis === 'x') return offsetPoint([0, a, b], centre);
  if (axis === 'y') return offsetPoint([a, 0, b], centre);
  return offsetPoint([a, b, 0], centre);
}

// Side wall of a cylinder standing along `axis`.
export function pointOnCylinderSurface({ radius, height, centre = [0, 0, 0], axis = 'y' }) {
  const angle = Math.random() * Math.PI * 2;
  const along = randomBetween(-0.5, 0.5) * height;
  const a = Math.cos(angle) * radius;
  const b = Math.sin(angle) * radius;
  if (axis === 'x') return offsetPoint([along, a, b], centre);
  if (axis === 'z') return offsetPoint([a, b, along], centre);
  return offsetPoint([a, along, b], centre);
}

// Point on a cubic Bezier curve, e.g. a charging cable.
export function pointOnCurve(p0, p1, p2, p3, jitter = 0) {
  const t = Math.random();
  const u = 1 - t;
  const point = [0, 1, 2].map(
    (i) => u * u * u * p0[i] + 3 * u * u * t * p1[i] + 3 * u * t * t * p2[i] + t * t * t * p3[i],
  );
  return point.map((value) => value + randomBetween(-jitter, jitter));
}

// Fallback when a shape has nothing to draw: a soft cloud.
export function createCloudPoints(count) {
  return buildPointsFromParts(count, [{ weight: 1, sample: () => pointInBox([1, 0.6, 0.4]) }]);
}
