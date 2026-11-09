// Builds the shatter copy of a product: one non-indexed geometry per product mesh, where every
// vertex carries its fragment's centre (aCentroid), flight direction (aDirection) and spin axis
// plus a random start offset (aSpin). The shatter shader (shaders/shatter-glsl.js) uses them.
//
// Big triangles are split first, so a flat face breaks into many pieces instead of two.
// Very dense meshes (more than SHATTER.chunkAbove triangles) group neighbouring triangles into
// chunks, keeping the fragment count near SHATTER.targetChunks.
// A mesh tagged with userData.shatterChunks (big panel arrays, small detailed parts in a big scene)
// is always chunked, into about that many pieces; the default rule then only counts the others.

import * as THREE from 'three';
import { SHATTER } from '../config/theme.js';
import { getSurfaceArea } from './product-geometry.js';
import { randomDirection } from './maths.js';

// productGroup: output of normaliseProduct(). Returns [{ geometry, material }].
export function buildFragmentParts(productGroup) {
  const meshes = productGroup.children.filter((child) => child.isMesh);
  const totalArea = meshes.reduce((sum, mesh) => sum + getSurfaceArea(mesh.geometry), 0);
  const maxEdge = getMaxEdge(totalArea);
  const triangleSets = meshes.map((mesh) => splitLargeTriangles(readTriangles(mesh.geometry), maxEdge));
  const chunkSizes = getChunkSizes(meshes, triangleSets);

  return meshes.map((mesh, index) => ({
    geometry: createFragmentGeometry(triangleSets[index], chunkSizes[index]),
    material: mesh.material,
  }));
}

// Grid cell size per mesh (0 = every triangle is its own fragment).
function getChunkSizes(meshes, triangleSets) {
  const areas = meshes.map((mesh) => getSurfaceArea(mesh.geometry));
  const isTagged = meshes.map((mesh) => mesh.userData.shatterChunks > 0);
  let freeTriangles = 0;
  let freeArea = 0;
  meshes.forEach((_, index) => {
    if (isTagged[index]) return;
    freeTriangles += triangleSets[index].length;
    freeArea += areas[index];
  });
  const defaultSize = freeTriangles > SHATTER.chunkAbove ? Math.sqrt(freeArea / SHATTER.targetChunks) : 0;
  return meshes.map((mesh, index) => (isTagged[index] ? Math.sqrt(areas[index] / mesh.userData.shatterChunks) : defaultSize));
}

// Splitting roughly makes 4 * area / edge^2 triangles; raise the edge if that would pass the cap.
function getMaxEdge(totalArea) {
  const edgeForBudget = Math.sqrt((4 * totalArea) / SHATTER.maxTriangles);
  return Math.max(SHATTER.maxEdge, edgeForBudget);
}

// --- Reading and splitting triangles ------------------------------------------
// A vertex is { p: [x, y, z], n: [x, y, z], uv: [u, v] | null, c: [r, g, b(, a)] | null };
// a triangle is [a, b, c]. Vertex colours are kept because GLB materials often rely on them.

function readTriangles(geometry) {
  const { position, normal, uv, color } = geometry.attributes;
  const index = geometry.index;
  const vertexCount = index ? index.count : position.count;
  const triangles = [];

  for (let i = 0; i < vertexCount; i += 3) {
    const corners = [0, 1, 2].map((corner) => (index ? index.getX(i + corner) : i + corner));
    triangles.push(corners.map((vertex) => readVertex(vertex, { position, normal, uv, color })));
  }
  return triangles;
}

function readVertex(i, { position, normal, uv, color }) {
  return {
    p: [position.getX(i), position.getY(i), position.getZ(i)],
    n: normal ? [normal.getX(i), normal.getY(i), normal.getZ(i)] : [0, 1, 0],
    uv: uv ? [uv.getX(i), uv.getY(i)] : null,
    c: color ? readComponents(color, i) : null,
  };
}

function readComponents(attribute, i) {
  const getters = ['getX', 'getY', 'getZ', 'getW'].slice(0, attribute.itemSize);
  return getters.map((getter) => attribute[getter](i));
}

// Halves the longest edge until every edge is short enough (or the budget runs out).
function splitLargeTriangles(triangles, maxEdge) {
  const done = [];
  const waiting = [...triangles];

  while (waiting.length > 0) {
    const triangle = waiting.pop();
    const longest = findLongestEdge(triangle);
    const isSmallEnough = longest.length <= maxEdge;
    const isOverBudget = done.length + waiting.length >= SHATTER.maxTriangles;
    if (isSmallEnough || isOverBudget) {
      done.push(triangle);
      continue;
    }
    waiting.push(...bisect(triangle, longest.corner));
  }
  return done;
}

function findLongestEdge(triangle) {
  let best = { corner: 0, length: 0 };
  for (let corner = 0; corner < 3; corner += 1) {
    const length = distance(triangle[corner].p, triangle[(corner + 1) % 3].p);
    if (length > best.length) best = { corner, length };
  }
  return best;
}

// Splits the edge from `corner` to the next corner; both halves keep the original winding.
function bisect(triangle, corner) {
  const a = triangle[corner];
  const b = triangle[(corner + 1) % 3];
  const c = triangle[(corner + 2) % 3];
  const middle = midpoint(a, b);
  return [
    [a, middle, c],
    [middle, b, c],
  ];
}

function midpoint(a, b) {
  return {
    p: lerp3(a.p, b.p),
    n: normalise(lerp3(a.n, b.n)),
    uv: a.uv && b.uv ? [(a.uv[0] + b.uv[0]) / 2, (a.uv[1] + b.uv[1]) / 2] : null,
    c: a.c && b.c ? a.c.map((value, k) => (value + b.c[k]) / 2) : null,
  };
}

// --- Fragments -----------------------------------------------------------------

function createFragmentGeometry(triangles, chunkSize) {
  const fragmentOfTriangle = assignFragments(triangles, chunkSize);
  const fragments = describeFragments(triangles, fragmentOfTriangle);
  const hasUv = triangles.every((triangle) => triangle[0].uv);
  const colourSize = triangles.every((triangle) => triangle[0].c) && triangles.length > 0 ? triangles[0][0].c.length : 0;
  const vertexCount = triangles.length * 3;

  const arrays = {
    position: new Float32Array(vertexCount * 3),
    normal: new Float32Array(vertexCount * 3),
    uv: hasUv ? new Float32Array(vertexCount * 2) : null,
    color: colourSize ? { size: colourSize, array: new Float32Array(vertexCount * colourSize) } : null,
    aCentroid: new Float32Array(vertexCount * 3),
    aDirection: new Float32Array(vertexCount * 3),
    aSpin: new Float32Array(vertexCount * 4),
  };

  triangles.forEach((triangle, triangleIndex) => {
    const fragment = fragments[fragmentOfTriangle[triangleIndex]];
    triangle.forEach((vertex, corner) => writeVertex(arrays, triangleIndex * 3 + corner, vertex, fragment));
  });

  return toBufferGeometry(arrays);
}

// Each triangle is its own fragment, or (dense meshes) shares one with its grid-cell neighbours.
function assignFragments(triangles, chunkSize) {
  if (!chunkSize) return triangles.map((_, index) => index);
  const fragmentByCell = new Map();
  return triangles.map((triangle) => {
    const centre = getTriangleCentre(triangle);
    const cell = centre.map((value) => Math.floor(value / chunkSize)).join(',');
    if (!fragmentByCell.has(cell)) fragmentByCell.set(cell, fragmentByCell.size);
    return fragmentByCell.get(cell);
  });
}

function describeFragments(triangles, fragmentOfTriangle) {
  const sums = new Map();
  triangles.forEach((triangle, index) => {
    const id = fragmentOfTriangle[index];
    const sum = sums.get(id) || { centre: [0, 0, 0], count: 0 };
    const centre = getTriangleCentre(triangle);
    sum.centre = sum.centre.map((value, axis) => value + centre[axis]);
    sum.count += 1;
    sums.set(id, sum);
  });

  const fragments = [];
  sums.forEach((sum, id) => {
    fragments[id] = createFragment(sum.centre.map((value) => value / sum.count));
  });
  return fragments;
}

// Flies roughly away from the model centre, with some randomness, and tumbles on a random axis.
function createFragment(centroid) {
  const outward = length(centroid) > 0.0001 ? normalise(centroid) : randomDirection();
  const jitter = randomDirection();
  const speed = 0.6 + Math.random() * 0.8;
  const direction = normalise(outward.map((value, axis) => value + jitter[axis] * 0.45)).map((value) => value * speed);
  return { centroid, direction, spinAxis: randomDirection(), random: Math.random() };
}

function writeVertex(arrays, vertexIndex, vertex, fragment) {
  arrays.position.set(vertex.p, vertexIndex * 3);
  arrays.normal.set(vertex.n, vertexIndex * 3);
  if (arrays.uv) arrays.uv.set(vertex.uv, vertexIndex * 2);
  if (arrays.color) arrays.color.array.set(vertex.c, vertexIndex * arrays.color.size);
  arrays.aCentroid.set(fragment.centroid, vertexIndex * 3);
  arrays.aDirection.set(fragment.direction, vertexIndex * 3);
  arrays.aSpin.set([...fragment.spinAxis, fragment.random], vertexIndex * 4);
}

function toBufferGeometry(arrays) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(arrays.position, 3));
  geometry.setAttribute('normal', new THREE.BufferAttribute(arrays.normal, 3));
  if (arrays.uv) geometry.setAttribute('uv', new THREE.BufferAttribute(arrays.uv, 2));
  if (arrays.color) geometry.setAttribute('color', new THREE.BufferAttribute(arrays.color.array, arrays.color.size));
  geometry.setAttribute('aCentroid', new THREE.BufferAttribute(arrays.aCentroid, 3));
  geometry.setAttribute('aDirection', new THREE.BufferAttribute(arrays.aDirection, 3));
  geometry.setAttribute('aSpin', new THREE.BufferAttribute(arrays.aSpin, 4));
  return geometry;
}

// --- Vector helpers (plain arrays) -----------------------------------------------

function getTriangleCentre([a, b, c]) {
  return [0, 1, 2].map((axis) => (a.p[axis] + b.p[axis] + c.p[axis]) / 3);
}

function lerp3(a, b) {
  return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
}

function distance(a, b) {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

function length(v) {
  return Math.hypot(v[0], v[1], v[2]);
}

function normalise(v) {
  const size = length(v) || 1;
  return [v[0] / size, v[1] / size, v[2] / size];
}
