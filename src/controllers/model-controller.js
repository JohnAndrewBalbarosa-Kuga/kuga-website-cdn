/**
 * Model controller
 * Gives every scene its shape. Results are cached per shape.
 *   Products: one object { mesh, points, chargeStart }.
 *     mesh   = models/<file>.glb when listed in models/manifest.json, otherwise the procedural
 *              stand-in from src/shapes. Either way it is normalised: transforms baked in,
 *              centred, largest side 1 (utils/product-geometry.js).
 *     points = particle targets sampled from that same mesh surface, so particles and solid line up.
 *   Hero, flow and quote: { points, chargeStart } only (logo-text, flow, gather point sets).
 *
 * Stand-ins get the quality tier's textureSize, so low-end devices build smaller canvas textures.
 *
 * Public methods:
 *   loadManifest()             read models/manifest.json (safe to fail)
 *   getShapeForScene(scene)    -> Promise<{ points: Float32Array, chargeStart: number, mesh?: THREE.Group }>
 *
 * Manifest format (shared with the model pipeline, keep exact):
 *   {"models":[{"id":"battery","file":"battery.glb","source":"procedural|generated|cad","scale":1,"rotation":[0,0,0]}]}
 *   rotation is in degrees [x, y, z]; scale multiplies the fitted unit size.
 */

import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { getProduct } from '../config/products.js';
import { createLogoTextPoints } from '../shapes/logo-text.js';
import { createFlowPoints } from '../shapes/flow.js';
import { createGatherPoints } from '../shapes/gather.js';
import { createCloudPoints } from '../shapes/shape-helpers.js';
import { getElementAspect } from '../utils/scene-layout.js';
import { normaliseProduct, sampleProductSurface, sortPointsByHeight } from '../utils/product-geometry.js';

export function createModelController({ particleCount, textureSize, modelsUrl }) {
  const cache = new Map();
  const reportedProducts = new Set();
  let manifestEntries = [];

  async function loadManifest() {
    try {
      const response = await fetch(new URL('manifest.json', modelsUrl), { cache: 'no-cache' });  // a new model shows without a hard reload
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const manifest = await response.json();
      manifestEntries = Array.isArray(manifest.models) ? manifest.models : [];
    } catch (error) {
      console.warn('[kuga-energy-field] Could not read models/manifest.json; using the stand-in models.', error);
      manifestEntries = [];
    }
  }

  function getShapeForScene(scene) {
    const key = getCacheKey(scene);
    if (!cache.has(key)) cache.set(key, buildShapeForScene(scene));
    return cache.get(key);
  }

  function getCacheKey(scene) {
    if (scene.shape === 'logo-text') return `logo-text:${scene.shapeText}`;
    if (scene.shape === 'gather') return `gather:${getElementAspect(scene.targetElement).toFixed(1)}`;
    return scene.shape;
  }

  async function buildShapeForScene(scene) {
    if (scene.shape === 'logo-text') return asPointShape(createLogoTextPoints(particleCount, scene.shapeText));
    if (scene.shape === 'flow') return asPointShape(createFlowPoints(particleCount));
    if (scene.shape === 'gather') {
      return asPointShape(createGatherPoints(particleCount, getElementAspect(scene.targetElement)));
    }

    const product = getProduct(scene.shape);
    if (!product) {
      console.warn(`[kuga-energy-field] Unknown data-shape "${scene.shape}"; showing a cloud.`);
      return asPointShape(createCloudPoints(particleCount));
    }
    return buildProductShape(scene, product);
  }

  async function buildProductShape(scene, product) {
    const mesh = await loadProductMesh(scene.shape, product);
    const points = sampleProductSurface(mesh, particleCount);
    const isCharge = scene.effect === 'charge';
    return { mesh, points: isCharge ? sortPointsByHeight(points) : points, chargeStart: 0 };
  }

  async function loadProductMesh(productId, product) {
    const entry = manifestEntries.find((model) => model.id === productId);
    if (!entry) return buildStandIn(productId, product, 'is not listed in models/manifest.json', 'info');

    try {
      const gltf = await new GLTFLoader().loadAsync(new URL(entry.file, modelsUrl).href);
      return normaliseProduct(gltf.scene, { rotation: entry.rotation, scale: entry.scale });
    } catch (error) {
      return buildStandIn(productId, product, `failed to load ${entry.file}: ${error.message || error}`, 'warn');
    }
  }

  function buildStandIn(productId, product, reason, level) {
    reportOnce(productId, reason, level);
    return normaliseProduct(product.buildStandIn({ textureSize }));
  }

  function reportOnce(productId, reason, level) {
    if (reportedProducts.has(productId)) return;
    reportedProducts.add(productId);
    console[level](`[kuga-energy-field] Model "${productId}" ${reason}; using the procedural stand-in.`);
  }

  return { loadManifest, getShapeForScene };
}

function asPointShape(points, chargeStart = 0) {
  return { points, chargeStart };
}
