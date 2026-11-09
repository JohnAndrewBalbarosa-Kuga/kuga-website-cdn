// Adds the scroll-driven sun glint (shaders/glint-glsl.js) to a glass material.
// The glint amount lives in material.userData.glint ({ value: 0..1 }); the solid model controller
// sets it during the hold phase. Settings: GLINT in config/theme.js.

import * as THREE from 'three';
import { GLINT } from '../config/theme.js';
import { patchMaterial } from './material-patch.js';
import {
  GLINT_FRAGMENT_HEADER,
  GLINT_FRAGMENT_LIGHT,
  GLINT_VERTEX_AFTER_BEGIN,
  GLINT_VERTEX_HEADER,
} from '../shaders/glint-glsl.js';

export function addGlint(material) {
  const uniforms = createGlintUniforms();
  patchMaterial(material, {
    cacheKey: 'kef-glint',
    uniforms,
    vertexHeader: GLINT_VERTEX_HEADER,
    vertexAfter: { begin_vertex: GLINT_VERTEX_AFTER_BEGIN },
    fragmentHeader: GLINT_FRAGMENT_HEADER,
    fragmentAfter: { emissivemap_fragment: GLINT_FRAGMENT_LIGHT },
  });
  material.userData.glint = uniforms.uGlint;
  return material;
}

function createGlintUniforms() {
  return {
    uGlint: { value: 0 },
    uGlintColour: { value: new THREE.Color(GLINT.colour) },
    uGlintStrength: { value: GLINT.strength },
    uGlintWidth: { value: GLINT.width },
    uGlintHaloWidth: { value: GLINT.haloWidth },
    uGlintHaloShare: { value: GLINT.haloShare },
    uGlintDirection: { value: new THREE.Vector2(...GLINT.direction).normalize() },
    uGlintReach: { value: GLINT.reach },
  };
}
