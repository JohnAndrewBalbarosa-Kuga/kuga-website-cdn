/**
 * Solid model controller
 * Shows the active product as a lit, solid mesh: the noise dissolve-in with a glowing Kuga-red
 * edge (solidify phase), stacked layers landing one on another (STACK_LANDING), the gentle extra turn while on show (hold phase), whole turns for products
 * with holdSpin, the sweep of any sun glint on its glass (hold phase) and a soft contact shadow underneath. It does not read scroll itself; the transition controller drives it.
 *
 * Public methods:
 *   showProduct(productId, mesh)   put this product's mesh on the stage (hidden until setVisible)
 *   setVisible(isVisible)
 *   setDissolve(amount)            0 = nothing, 1 = fully solid
 *   setHold(holdProgress)          0..1 through the hold phase: turn (0 at both ends), spin, glint
 *   hide()
 */

import * as THREE from 'three';
import { DISSOLVE, GLINT, LIGHTING, SOLID, STACK_LANDING } from '../config/theme.js';
import { getProduct } from '../config/products.js';
import { easeOutQuad, progressInRange, smoothstep } from '../utils/maths.js';
import { collectMaterials, patchMaterial } from '../utils/material-patch.js';
import {
  DISSOLVE_FRAGMENT_CUT,
  DISSOLVE_FRAGMENT_GLOW,
  DISSOLVE_FRAGMENT_HEADER,
  DISSOLVE_VERTEX_AFTER_BEGIN,
  DISSOLVE_VERTEX_HEADER,
} from '../shaders/dissolve-glsl.js';

export function createSolidModelController({ render, stage, quality }) {
  const holder = new THREE.Group();
  holder.visible = false;
  stage.add(holder);

  const groundShadow = quality.shadows && LIGHTING.groundShadowOpacity > 0 ? createGroundShadow() : null;
  if (groundShadow) holder.add(groundShadow);

  const uniformsByProduct = new Map();
  let currentMesh = null;
  let currentUniforms = null;
  let currentGlints = [];
  let currentSpin = 0;
  let currentTurn = SOLID.holdTurn;
  let currentStack = [];

  function showProduct(productId, mesh) {
    if (currentMesh !== mesh) swapMesh(mesh);
    currentUniforms = getDissolveUniforms(productId, mesh);
    currentGlints = collectMaterials(mesh).map((material) => material.userData.glint).filter(Boolean);
    currentSpin = getHoldSpin(productId);
    currentTurn = getHoldTurn(productId);
    currentStack = getStackMeshes(mesh);
    placeGroundShadowUnder(mesh);
    render.requestRender();
  }

  function swapMesh(mesh) {
    if (currentMesh) holder.remove(currentMesh);
    currentMesh = mesh;
    holder.add(mesh);
  }

  function setVisible(isVisible) {
    holder.visible = Boolean(isVisible && currentMesh);
    render.requestRender();
  }

  function setDissolve(amount) {
    if (!currentUniforms) return;
    currentUniforms.uDissolve.value = amount;
    landStackLayers(currentStack, amount);
    setCastShadow(amount >= 1);
    if (groundShadow) groundShadow.material.opacity = LIGHTING.groundShadowOpacity * amount;
    render.requestRender();
  }

  // The turn is half a sine and the spin is whole turns: both end where they started, so the
  // fragments begin exactly where the solid was.
  function setHold(holdProgress) {
    const turn = currentTurn * Math.sin(Math.PI * holdProgress);
    const spin = Math.PI * 2 * currentSpin * smoothstep(SOLID.spinRange[0], SOLID.spinRange[1], holdProgress);
    holder.rotation.y = turn + spin;
    const glint = progressInRange(holdProgress, GLINT.holdRange);
    currentGlints.forEach((uniform) => {
      uniform.value = glint;
    });
    render.requestRender();
  }

  // Parts that are still dissolving would cast shadows of invisible pieces, so wait until solid.
  function setCastShadow(shouldCast) {
    if (!currentMesh || !quality.shadows) return;
    currentMesh.traverse((object) => {
      if (object.isMesh) object.castShadow = shouldCast;
    });
  }

  function hide() {
    holder.visible = false;
    render.requestRender();
  }

  function getDissolveUniforms(productId, mesh) {
    if (uniformsByProduct.has(productId)) return uniformsByProduct.get(productId);
    const uniforms = createDissolveUniforms();
    collectMaterials(mesh).forEach((material) => addDissolve(material, uniforms));
    uniformsByProduct.set(productId, uniforms);
    return uniforms;
  }

  function placeGroundShadowUnder(mesh) {
    if (!groundShadow) return;
    const bounds = new THREE.Box3().setFromObject(mesh, true);
    groundShadow.position.y = bounds.min.y - 0.002;
  }

  return { showProduct, setVisible, setDissolve, setHold, hide };
}

// Meshes tagged with userData.stackLayer, plus the number of layers.
function getStackMeshes(mesh) {
  const meshes = mesh.children.filter((child) => child.isMesh && Number.isFinite(child.userData.stackLayer));
  const layerCount = meshes.reduce((most, child) => Math.max(most, child.userData.stackLayer + 1), 0);
  return meshes.map((child) => ({ mesh: child, layer: child.userData.stackLayer, layerCount }));
}

// Each layer drops from STACK_LANDING.dropHeight above its place and lands, bottom layer first.
// At amount 1 every layer is back at 0, so the solid lines up with the particles and fragments.
function landStackLayers(stack, amount) {
  const { dropHeight, landShare } = STACK_LANDING;
  stack.forEach(({ mesh, layer, layerCount }) => {
    const start = layerCount > 1 ? (layer / (layerCount - 1)) * (1 - landShare) : 0;
    const landed = easeOutQuad(progressInRange(amount, [start, start + landShare]));
    mesh.position.y = dropHeight * (1 - landed);
  });
}

function getHoldSpin(productId) {
  const product = getProduct(productId);
  return product && product.holdSpin ? product.holdSpin : 0;
}

function getHoldTurn(productId) {
  const product = getProduct(productId);
  return product && Number.isFinite(product.holdTurn) ? product.holdTurn : SOLID.holdTurn;
}

function createDissolveUniforms() {
  return {
    uDissolve: { value: 1 },
    uEdgeColour: { value: new THREE.Color(DISSOLVE.edgeColour) },
    uEdgeWidth: { value: DISSOLVE.edgeWidth },
    uEdgeIntensity: { value: DISSOLVE.edgeIntensity },
    uNoiseScale: { value: DISSOLVE.noiseScale },
    uHeightBias: { value: DISSOLVE.heightBias },
  };
}

function addDissolve(material, uniforms) {
  patchMaterial(material, {
    cacheKey: 'kef-dissolve',
    uniforms,
    vertexHeader: DISSOLVE_VERTEX_HEADER,
    vertexAfter: { begin_vertex: DISSOLVE_VERTEX_AFTER_BEGIN },
    fragmentHeader: DISSOLVE_FRAGMENT_HEADER,
    fragmentAfter: {
      clipping_planes_fragment: DISSOLVE_FRAGMENT_CUT,
      emissivemap_fragment: DISSOLVE_FRAGMENT_GLOW,
    },
  });
}

// Transparent floor that only shows the key light's shadow: a soft contact shadow on white.
function createGroundShadow() {
  const material = new THREE.ShadowMaterial({ opacity: LIGHTING.groundShadowOpacity, transparent: true });
  const ground = new THREE.Mesh(new THREE.CircleGeometry(0.8, 48), material);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  return ground;
}
