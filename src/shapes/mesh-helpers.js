// Small helpers for the procedural stand-in product meshes.
// Every material function returns a NEW material, so each product owns its materials
// (the dissolve and shatter effects patch materials per product).

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { COLOURS } from '../config/theme.js';
import { addGlint } from '../utils/glint-material.js';

// Adds one mesh to the group at a position / rotation (radians) and returns it.
export function addPart(group, geometry, material, position = [0, 0, 0], rotation = [0, 0, 0]) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(...position);
  mesh.rotation.set(...rotation);
  group.add(mesh);
  return mesh;
}

export function roundedBox([width, height, depth], radius, segments = 3) {
  return new RoundedBoxGeometry(width, height, depth, segments, radius);
}

export function box([width, height, depth]) {
  return new THREE.BoxGeometry(width, height, depth);
}

// A box cut into cells of about cellSize on every face. Big flat parts built this way shatter into
// even pieces; a rounded box has long thin edge strips that the shatter splits into thousands of slivers.
export function gridBox([width, height, depth], cellSize) {
  const cells = (size) => Math.max(1, Math.ceil(size / cellSize));
  return new THREE.BoxGeometry(width, height, depth, cells(width), cells(height), cells(depth));
}

// --- Materials -------------------------------------------------------------

export function whiteCasing() {
  return new THREE.MeshPhysicalMaterial({
    color: '#ECEDEF',
    roughness: 0.42,
    metalness: 0,
    clearcoat: 0.35,
    clearcoatRoughness: 0.35,
  });
}

export function charcoalPlastic() {
  return new THREE.MeshStandardMaterial({ color: COLOURS.charcoal, roughness: 0.55, metalness: 0.1 });
}

export function brushedAluminium() {
  return new THREE.MeshStandardMaterial({ color: '#C9CDD2', roughness: 0.32, metalness: 1 });
}

export function darkMetal() {
  return new THREE.MeshStandardMaterial({ color: '#4A4E54', roughness: 0.45, metalness: 0.8 });
}

export function rubber() {
  return new THREE.MeshStandardMaterial({ color: '#1F1F21', roughness: 0.8, metalness: 0 });
}

export function darkGlass() {
  return new THREE.MeshPhysicalMaterial({
    color: '#101418',
    roughness: 0.15,
    metalness: 0.2,
    clearcoat: 1,
    clearcoatRoughness: 0.05,
  });
}

export function glowing(colour, intensity = 2) {
  return new THREE.MeshStandardMaterial({ color: colour, emissive: colour, emissiveIntensity: intensity, roughness: 0.4 });
}

// Solar panel front: the cell texture under a glossy glass coat that picks up the environment,
// plus the scroll-driven sun glint. surfaceMap holds roughness (green) and metalness (blue).
export function panelGlass(colourMap, surfaceMap) {
  const material = new THREE.MeshPhysicalMaterial({
    map: colourMap,
    roughnessMap: surfaceMap,
    metalnessMap: surfaceMap,
    roughness: 1,
    metalness: 1,
    clearcoat: 1,
    clearcoatRoughness: 0.03,
    specularIntensity: 0.6,
  });
  return addGlint(material);
}

// Anodised aluminium: silver with a soft satin sheen.
export function anodisedAluminium() {
  return new THREE.MeshPhysicalMaterial({
    color: '#D3D7DC',
    roughness: 0.3,
    metalness: 1,
    clearcoat: 0.4,
    clearcoatRoughness: 0.2,
  });
}

// Solar panel backsheet: matt white polymer.
export function backsheetWhite() {
  return new THREE.MeshStandardMaterial({ color: '#F1F2F4', roughness: 0.7, metalness: 0 });
}

// Light grey powder-coated steel, for outdoor cabinets.
export function powderCoatGrey() {
  return new THREE.MeshPhysicalMaterial({
    color: '#E2E5E8',
    roughness: 0.55,
    metalness: 0.05,
    clearcoat: 0.2,
    clearcoatRoughness: 0.5,
  });
}

// Brushed stainless steel: bright metal with a streaked (anisotropic) sheen.
export function stainlessSteel() {
  return new THREE.MeshPhysicalMaterial({
    color: '#D9DCDF',
    roughness: 0.28,
    metalness: 1,
    anisotropy: 0.6,
  });
}

export function copperPipe() {
  return new THREE.MeshStandardMaterial({ color: '#B8734A', roughness: 0.35, metalness: 1 });
}

export function brass() {
  return new THREE.MeshStandardMaterial({ color: '#C8A65A', roughness: 0.3, metalness: 1 });
}

// Painted steel lever, e.g. a valve handle.
export function paintedRed() {
  return new THREE.MeshStandardMaterial({ color: COLOURS.red, roughness: 0.45, metalness: 0.1 });
}

// Screen with a few red and grey bars, like a live power readout.
export function screenWithReadout() {
  const readout = createReadoutTexture();
  return new THREE.MeshStandardMaterial({
    map: readout,
    emissive: '#FFFFFF',
    emissiveMap: readout,
    emissiveIntensity: 0.6,
    roughness: 0.2,
  });
}

// --- Canvas textures ---------------------------------------------------------

function createReadoutTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 64;
  const context = canvas.getContext('2d');
  context.fillStyle = '#0B0E12';
  context.fillRect(0, 0, 128, 64);
  context.fillStyle = COLOURS.red;
  context.fillRect(10, 12, 70, 8);
  context.fillStyle = '#9AA3AD';
  context.fillRect(10, 28, 48, 5);
  context.fillRect(10, 40, 90, 5);
  context.fillRect(10, 52, 30, 5);
  return asColourTexture(canvas);
}

function asColourTexture(canvas) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

// Precast concrete: plinths, dock aprons.
export function concrete() {
  return new THREE.MeshStandardMaterial({ color: '#BFC2C5', roughness: 0.9, metalness: 0 });
}

// Asphalt for car parks.
export function asphalt() {
  return new THREE.MeshStandardMaterial({ color: '#3A3C40', roughness: 0.95, metalness: 0 });
}

// --- Shatter budget ------------------------------------------------------------

// Tags every mesh in the group so the whole group breaks into about `pieces` fragments, shared out
// by triangle count (utils/fragment-geometry.js reads userData.shatterChunks). Use it on detailed
// parts that are small in a big scene, e.g. the battery cabinet beside a warehouse.
export function limitShatterPieces(group, pieces) {
  const meshes = [];
  group.traverse((object) => {
    if (object.isMesh) meshes.push(object);
  });
  const counts = meshes.map((mesh) => countTriangles(mesh.geometry));
  const total = counts.reduce((sum, count) => sum + count, 0) || 1;
  meshes.forEach((mesh, index) => {
    mesh.userData.shatterChunks = Math.max(1, Math.round((pieces * counts[index]) / total));
  });
  return group;
}

export function countTriangles(geometry) {
  return (geometry.index ? geometry.index.count : geometry.attributes.position.count) / 3;
}
