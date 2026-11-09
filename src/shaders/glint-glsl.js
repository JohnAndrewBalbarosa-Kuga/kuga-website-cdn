// Sun glint on solar glass: a sharp streak with a soft halo that sweeps across the glass.
// uGlint 0..1 is how far through the sweep we are (scroll-driven); the glint fades in and out
// at both ends, so it is invisible outside the sweep.

export const GLINT_VERTEX_HEADER = /* glsl */ `
  varying vec3 vGlintPosition;
`;

// Product meshes are baked into model space, so position is model space (shared by every panel).
export const GLINT_VERTEX_AFTER_BEGIN = /* glsl */ `
  vGlintPosition = position;
`;

export const GLINT_FRAGMENT_HEADER = /* glsl */ `
  uniform float uGlint;
  uniform vec3 uGlintColour;
  uniform float uGlintStrength;
  uniform float uGlintWidth;
  uniform float uGlintHaloWidth;
  uniform float uGlintHaloShare;
  uniform vec2 uGlintDirection;
  uniform float uGlintReach;
  varying vec3 vGlintPosition;
`;

// Runs after the emissive map: adds the band as light.
export const GLINT_FRAGMENT_LIGHT = /* glsl */ `
  if (uGlint > 0.0 && uGlint < 1.0) {
    float glintCentre = mix(-uGlintReach, uGlintReach, uGlint);
    float glintDistance = dot(vGlintPosition.xy, uGlintDirection) - glintCentre;
    float glintCore = exp(-pow(glintDistance / uGlintWidth, 2.0));
    float glintHalo = exp(-pow(glintDistance / (uGlintWidth * uGlintHaloWidth), 2.0));
    float glintFade = sin(3.14159265 * uGlint);
    float glint = (glintCore + glintHalo * uGlintHaloShare) * glintFade * uGlintStrength;
    totalEmissiveRadiance += uGlintColour * glint;
  }
`;
