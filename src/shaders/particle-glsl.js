// Particle field shader. Morphs each particle from aFrom to position, adds drift, the hero
// break (a swirl round the word plus a scatter), the product burst (particles flying out with the shatter), the pointer push and
// the battery charge fill.

import { MORPH } from '../config/theme.js';

const SPREAD = MORPH.spread.toFixed(3);
const SCATTER_SHAPE = 'vec3(1.0, 0.45, 1.0)'; // the hero break spreads less up and down (mirrored in particle-controller.js)

export const PARTICLE_VERTEX_SHADER = /* glsl */ `
  attribute vec3 aFrom;
  attribute float aDelay;
  attribute float aOrder;
  attribute float aSeed;
  attribute vec3 aDrift;
  attribute vec3 aColor;

  uniform float uTime;
  uniform float uMorph;
  uniform float uSize;
  uniform float uPixelRatio;
  uniform float uTurbulence;
  uniform float uScatter;
  uniform float uSwirl;
  uniform float uBurst;
  uniform float uOpacity;
  uniform float uChargeOn;
  uniform float uChargeStart;
  uniform float uReveal;
  uniform vec3 uPointer;
  uniform float uRepelRadius;
  uniform float uRepelStrength;
  uniform vec3 uHoverColor;

  varying vec3 vColor;
  varying float vAlpha;

  float getMorphAmount() {
    float t = clamp(uMorph * (1.0 + ${SPREAD}) - aDelay * ${SPREAD}, 0.0, 1.0);
    return t * t * (3.0 - 2.0 * t);
  }

  float getChargeVisibility() {
    if (uChargeOn < 0.5 || aOrder < uChargeStart) return 1.0;
    float fillPosition = (aOrder - uChargeStart) / max(1.0 - uChargeStart, 0.0001);
    return step(fillPosition, uReveal);
  }

  // Mirrors getSwirled() in particle-controller.js: turns the point round the vertical axis through
  // the shape centre, so the broken word whirls like a vortex but stays in its own band of the screen.
  vec3 getSwirled(vec3 point) {
    float angle = uSwirl * (0.5 + aSeed);
    float c = cos(angle);
    float s = sin(angle);
    return vec3(point.x * c + point.z * s, point.y, -point.x * s + point.z * c);
  }

  // Mirrors getBurstOffset() in particle-controller.js (used when a new morph starts).
  vec3 getBurstOffset(vec3 shapePosition) {
    return normalize(shapePosition + 0.0001) * uBurst * (0.6 + aSeed * 0.8);
  }

  void main() {
    float morph = getMorphAmount();
    vec3 shapePosition = getSwirled(mix(aFrom, position, morph));

    float inFlight = sin(morph * 3.14159);
    float drift = (uTurbulence + inFlight * 0.6) * 0.04;
    vec3 wobble = vec3(
      sin(uTime * 0.7 + aSeed * 6.28 + shapePosition.y * 4.0),
      cos(uTime * 0.6 + aSeed * 12.0 + shapePosition.x * 4.0),
      sin(uTime * 0.5 + aSeed * 3.0 + shapePosition.z * 4.0)
    );
    vec3 burst = getBurstOffset(shapePosition);
    shapePosition += wobble * drift + aDrift * ${SCATTER_SHAPE} * uScatter * (0.4 + aSeed) + burst;

    vec4 worldPosition = modelMatrix * vec4(shapePosition, 1.0);
    vec2 awayFromPointer = worldPosition.xy - uPointer.xy;
    float pointerDistance = length(awayFromPointer);
    float push = (1.0 - smoothstep(0.0, uRepelRadius, pointerDistance)) * uRepelStrength;
    worldPosition.xy += normalize(awayFromPointer + 0.0001) * push;

    vec4 viewPosition = viewMatrix * worldPosition;
    gl_Position = projectionMatrix * viewPosition;

    float visible = getChargeVisibility() * step(0.001, uOpacity);
    gl_PointSize = uSize * uPixelRatio * (0.5 + aSeed * 0.8) * visible / -viewPosition.z;

    vColor = mix(aColor, uHoverColor, clamp(push * 2.0, 0.0, 1.0));
    vAlpha = visible * uOpacity * (0.8 + aSeed * 0.2); // stronger than on dark: pale dots wash out on white
  }
`;

export const PARTICLE_FRAGMENT_SHADER = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    float distanceFromCentre = length(gl_PointCoord - 0.5);
    if (distanceFromCentre > 0.5) discard;
    float softness = smoothstep(0.5, 0.0, distanceFromCentre);
    gl_FragColor = vec4(vColor, softness * vAlpha);
  }
`;
