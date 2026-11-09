// Turns any product (a loaded GLB scene or a procedural stand-in group) into a clean "model space"
// group: every mesh's transform baked into its geometry, centred on the origin, largest side 1.
// The solid model, its particle points and its shatter fragments are all built from this one
// group, so they line up exactly.

import * as THREE from 'three';
import { MeshSurfaceSampler } from 'three/addons/math/MeshSurfaceSampler.js';

// rotation: degrees [x, y, z] applied before fitting. scale: multiplies the fitted unit size.
// Named points in root.userData.anchors (THREE.Vector3, in the root's space) come out in
// group.userData.anchors, moved into model space with the meshes (the camera aims at them).
export function normaliseProduct(root, { rotation = [0, 0, 0], scale = 1 } = {}) {
  const parts = collectParts(root);
  if (parts.length === 0) throw new Error('model has no meshes');

  const geometries = parts.map((part) => part.geometry);
  const toModelSpace = applyRotation(geometries, rotation);
  toModelSpace.premultiply(fitIntoUnitBox(geometries, scale));

  const group = new THREE.Group();
  parts.forEach((part) => group.add(createModelMesh(part)));
  group.userData.anchors = collectAnchors(root, toModelSpace);
  return group;
}

// Optional per-mesh settings read from a stand-in mesh's userData:
//   stackLayer     stacked products land layer by layer
//   shatterChunks  the mesh breaks into about this many pieces (utils/fragment-geometry.js)
function createModelMesh({ geometry, material, stackLayer, shatterChunks }) {
  if (!geometry.attributes.normal) geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  if (Number.isFinite(stackLayer)) mesh.userData.stackLayer = stackLayer;
  if (shatterChunks > 0) mesh.userData.shatterChunks = shatterChunks;
  return mesh;
}

function collectAnchors(root, toModelSpace) {
  const anchors = {};
  Object.entries(root.userData.anchors || {}).forEach(([name, point]) => {
    if (!point || !point.isVector3) return;
    anchors[name] = point.clone().applyMatrix4(root.matrixWorld).applyMatrix4(toModelSpace);
  });
  return anchors;
}

// One { geometry, material } per mesh and per material slot, with the scene transform baked in.
function collectParts(root) {
  const parts = [];
  root.updateMatrixWorld(true);
  root.traverse((object) => {
    if (!object.isMesh || !object.geometry || !object.geometry.attributes.position) return;
    splitByMaterial(object).forEach((part) => {
      part.geometry.applyMatrix4(object.matrixWorld);
      part.stackLayer = object.userData.stackLayer;
      part.shatterChunks = object.userData.shatterChunks;
      parts.push(part);
    });
  });
  return parts;
}

function splitByMaterial(mesh) {
  const geometry = mesh.geometry.clone();
  if (!Array.isArray(mesh.material)) return [{ geometry, material: mesh.material }];
  if (geometry.groups.length === 0) return [{ geometry, material: mesh.material[0] }];
  if (!geometry.index) geometry.setIndex(createSequentialIndex(geometry.attributes.position.count));

  return geometry.groups.map((group) => {
    const slot = geometry.clone();
    slot.clearGroups();
    slot.setIndex(Array.from(geometry.index.array.slice(group.start, group.start + group.count)));
    return { geometry: slot, material: mesh.material[group.materialIndex] || mesh.material[0] };
  });
}

function createSequentialIndex(count) {
  return Array.from({ length: count }, (_, i) => i);
}

// Both return the matrix they applied, so anchors can follow the meshes.
function applyRotation(geometries, rotationInDegrees) {
  if (!Array.isArray(rotationInDegrees)) return new THREE.Matrix4();
  const [x, y, z] = rotationInDegrees.map((degrees) => THREE.MathUtils.degToRad(Number(degrees) || 0));
  const matrix = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(x, y, z));
  geometries.forEach((geometry) => geometry.applyMatrix4(matrix));
  return matrix;
}

function fitIntoUnitBox(geometries, scale) {
  const bounds = new THREE.Box3();
  geometries.forEach((geometry) => {
    geometry.computeBoundingBox();
    bounds.union(geometry.boundingBox);
  });

  const centre = bounds.getCenter(new THREE.Vector3());
  const size = bounds.getSize(new THREE.Vector3());
  const largestSide = Math.max(size.x, size.y, size.z) || 1;
  const factor = (Number(scale) || 1) / largestSide;

  const matrix = new THREE.Matrix4()
    .makeScale(factor, factor, factor)
    .multiply(new THREE.Matrix4().makeTranslation(-centre.x, -centre.y, -centre.z));
  geometries.forEach((geometry) => {
    geometry.applyMatrix4(matrix);
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
  });
  return matrix;
}

// --- Surface sampling for the particles ---------------------------------------

// Bigger meshes get more points, so a multi-part model looks evenly covered.
export function sampleProductSurface(group, count) {
  const geometries = group.children.filter((child) => child.isMesh).map((mesh) => mesh.geometry);
  const areas = geometries.map(getSurfaceArea);
  const totalArea = areas.reduce((sum, area) => sum + area, 0);
  if (!(totalArea > 0)) throw new Error('model has no surface area');

  const points = new Float32Array(count * 3);
  const sample = new THREE.Vector3();
  let written = 0;

  geometries.forEach((geometry, meshIndex) => {
    const isLastMesh = meshIndex === geometries.length - 1;
    const share = Math.round((count * areas[meshIndex]) / totalArea);
    const meshCount = isLastMesh ? count - written : Math.min(share, count - written);
    if (meshCount <= 0 || areas[meshIndex] <= 0) return;

    const sampler = new MeshSurfaceSampler(new THREE.Mesh(geometry)).build();
    for (let i = 0; i < meshCount; i += 1) {
      sampler.sample(sample);
      points.set([sample.x, sample.y, sample.z], (written + i) * 3);
    }
    written += meshCount;
  });

  fillRemainingPoints(points, written, count);
  return points;
}

export function getSurfaceArea(geometry) {
  const position = geometry.attributes.position;
  const index = geometry.index;
  const triangleCount = index ? index.count / 3 : position.count / 3;
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const triangle = new THREE.Triangle();
  let area = 0;

  for (let i = 0; i < triangleCount; i += 1) {
    a.fromBufferAttribute(position, index ? index.getX(i * 3) : i * 3);
    b.fromBufferAttribute(position, index ? index.getX(i * 3 + 1) : i * 3 + 1);
    c.fromBufferAttribute(position, index ? index.getX(i * 3 + 2) : i * 3 + 2);
    area += triangle.set(a, b, c).getArea();
  }
  return area;
}

// If the last mesh had no area, reuse earlier points so the array is always full.
function fillRemainingPoints(points, written, count) {
  if (written >= count || written === 0) return;
  for (let i = written; i < count; i += 1) {
    const source = Math.floor(Math.random() * written) * 3;
    points.set(points.subarray(source, source + 3), i * 3);
  }
}

// Bottom to top, so the particle "charge" fill rises up the product.
export function sortPointsByHeight(points) {
  const rows = [];
  for (let i = 0; i < points.length; i += 3) rows.push([points[i], points[i + 1], points[i + 2]]);
  rows.sort((a, b) => a[1] - b[1]);
  const sorted = new Float32Array(points.length);
  rows.forEach((point, i) => sorted.set(point, i * 3));
  return sorted;
}
