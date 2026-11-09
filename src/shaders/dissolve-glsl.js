// Dissolve-in for the solid model. Injected into the model's own PBR materials, so lighting,
// reflections and textures stay exactly as they are; this only hides pixels and adds a glowing edge.
// uDissolve 0 = nothing visible, 1 = fully solid.

import { VALUE_NOISE_GLSL } from './noise-glsl.js';

export const DISSOLVE_VERTEX_HEADER = /* glsl */ `
  varying vec3 vDissolvePosition;
`;

// Product meshes are baked into model space (unit box, centred), so position is model space.
export const DISSOLVE_VERTEX_AFTER_BEGIN = /* glsl */ `
  vDissolvePosition = position;
`;

export const DISSOLVE_FRAGMENT_HEADER = /* glsl */ `
  uniform float uDissolve;
  uniform vec3 uEdgeColour;
  uniform float uEdgeWidth;
  uniform float uEdgeIntensity;
  uniform float uNoiseScale;
  uniform float uHeightBias;
  varying vec3 vDissolvePosition;
  ${VALUE_NOISE_GLSL}
`;

// Runs at the top of main(): drops pixels past the dissolve front and measures the glow.
export const DISSOLVE_FRAGMENT_CUT = /* glsl */ `
  float dissolveNoise = mix(
    kefDissolveNoise(vDissolvePosition * uNoiseScale),
    clamp(vDissolvePosition.y + 0.5, 0.0, 1.0),
    uHeightBias
  );
  float dissolveFront = uDissolve * (1.0 + uEdgeWidth);
  if (dissolveNoise > dissolveFront) discard;
  float dissolveGlow = uDissolve >= 1.0 ? 0.0 : smoothstep(dissolveFront - uEdgeWidth, dissolveFront, dissolveNoise);
`;

// Runs after the emissive map: adds the Kuga-red edge.
export const DISSOLVE_FRAGMENT_GLOW = /* glsl */ `
  totalEmissiveRadiance += uEdgeColour * dissolveGlow * uEdgeIntensity;
`;
