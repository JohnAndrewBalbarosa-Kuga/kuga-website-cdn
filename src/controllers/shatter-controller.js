/**
 * Shatter controller
 * Builds a fragment copy of a product mesh (cached per product) and breaks it apart:
 * fragments fly outwards, tumble and shrink. All the motion runs in the vertex shader, driven
 * by one number, so scrolling back simply reassembles the model.
 *
 * Public methods:
 *   prepareProduct(productId, mesh)   build (or reuse) this product's fragments and put them on stage
 *   warmProduct(productId, mesh)      build this product's fragments ahead of time (no stage change)
 *   setProgress(amount)               0 = intact, 1 = gone; hidden at both ends
 *   hide()
 */

import * as THREE from 'three';
import { SHATTER } from '../config/theme.js';
import { buildFragmentParts } from '../utils/fragment-geometry.js';
import { patchMaterial } from '../utils/material-patch.js';
import {
  SHATTER_VERTEX_AFTER_BEGIN,
  SHATTER_VERTEX_AFTER_NORMAL,
  SHATTER_VERTEX_HEADER,
} from '../shaders/shatter-glsl.js';

export function createShatterController({ render, stage }) {
  const holder = new THREE.Group();
  holder.visible = false;
  stage.add(holder);

  const fragmentsByProduct = new Map();
  let current = null;

  function warmProduct(productId, mesh) {
    if (!fragmentsByProduct.has(productId)) fragmentsByProduct.set(productId, buildFragments(mesh));
  }

  function prepareProduct(productId, mesh) {
    warmProduct(productId, mesh);
    const next = fragmentsByProduct.get(productId);
    if (next === current) return;
    if (current) holder.remove(current.group);
    current = next;
    holder.add(current.group);
  }

  function setProgress(amount) {
    if (!current) return;
    current.uniforms.uShatter.value = amount;
    holder.visible = amount > 0 && amount < 1;
    render.requestRender();
  }

  function hide() {
    holder.visible = false;
    render.requestRender();
  }

  return { prepareProduct, warmProduct, setProgress, hide };
}

function buildFragments(mesh) {
  const uniforms = createShatterUniforms();
  const group = new THREE.Group();
  const shatterMaterials = new Map();

  buildFragmentParts(mesh).forEach(({ geometry, material }) => {
    if (!shatterMaterials.has(material)) shatterMaterials.set(material, createShatterMaterial(material, uniforms));
    const fragmentMesh = new THREE.Mesh(geometry, shatterMaterials.get(material));
    fragmentMesh.frustumCulled = false; // fragments fly outside the original bounds
    group.add(fragmentMesh);
  });
  return { group, uniforms };
}

// Same look as the solid, but double-sided because thin fragments show their backs as they tumble.
function createShatterMaterial(material, uniforms) {
  const copy = material.clone();
  copy.side = THREE.DoubleSide;
  patchMaterial(copy, {
    cacheKey: 'kef-shatter',
    uniforms,
    vertexHeader: SHATTER_VERTEX_HEADER,
    vertexAfter: {
      beginnormal_vertex: SHATTER_VERTEX_AFTER_NORMAL,
      begin_vertex: SHATTER_VERTEX_AFTER_BEGIN,
    },
  });
  return copy;
}

function createShatterUniforms() {
  return {
    uShatter: { value: 0 },
    uDistance: { value: SHATTER.distance },
    uSpin: { value: SHATTER.spin },
    uStagger: { value: SHATTER.stagger },
  };
}
