// Shatter for the fragment copy of a product mesh. Every vertex knows its fragment's centre,
// flight direction, spin axis and a random start offset (see utils/fragment-geometry.js).
// uShatter 0 = intact model, 1 = every fragment gone.

export const SHATTER_VERTEX_HEADER = /* glsl */ `
  attribute vec3 aCentroid;
  attribute vec3 aDirection;
  attribute vec4 aSpin; // xyz spin axis, w random 0..1
  uniform float uShatter;
  uniform float uDistance;
  uniform float uSpin;
  uniform float uStagger;

  float getFragmentProgress() {
    return clamp((uShatter - aSpin.w * uStagger) / (1.0 - uStagger), 0.0, 1.0);
  }

  float getFragmentAngle() {
    return uSpin * getFragmentProgress() * (0.5 + aSpin.w);
  }

  vec3 rotateAroundAxis(vec3 v, vec3 axis, float angle) {
    float c = cos(angle);
    float s = sin(angle);
    return v * c + cross(axis, v) * s + axis * dot(axis, v) * (1.0 - c);
  }
`;

// Turns the normal with the fragment so lighting stays right while it tumbles.
export const SHATTER_VERTEX_AFTER_NORMAL = /* glsl */ `
  objectNormal = rotateAroundAxis(objectNormal, aSpin.xyz, getFragmentAngle());
`;

// Spins the fragment round its centre, shrinks it and sends it outwards.
export const SHATTER_VERTEX_AFTER_BEGIN = /* glsl */ `
  float fragmentProgress = getFragmentProgress();
  float fragmentFlight = 1.0 - (1.0 - fragmentProgress) * (1.0 - fragmentProgress);
  vec3 fragmentLocal = rotateAroundAxis(position - aCentroid, aSpin.xyz, getFragmentAngle());
  transformed = aCentroid + fragmentLocal * (1.0 - fragmentProgress) + aDirection * uDistance * fragmentFlight;
`;
