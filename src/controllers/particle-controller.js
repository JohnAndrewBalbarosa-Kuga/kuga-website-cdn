/**
 * Particle controller
 * Draws the particle field (THREE.Points + the shader in shaders/particle-glsl.js) on the stage
 * and morphs it from one point set to the next. Handles the mouse push, the hero break into energy
 * (HERO_BREAK: the word swirls, scatters and drifts harder) and the battery "charge" fill.
 *
 * Two ways a morph runs:
 *   - timed (hero, flow, quote): a short tween, scatter and charge follow the section's scroll.
 *   - followScroll (product scenes): nothing moves on its own; the transition controller sets
 *     morph, opacity, burst and charge from scroll through setScrollState(). The morph then
 *     moves toward the asked value at most MORPH.maxRate per second, so particles never jump.
 *
 * Public methods:
 *   morphParticlesToShape(shape, scene, { followScroll })   shape = { points: Float32Array, chargeStart }
 *   setScrollState({ morph, opacity, burst, charge })       product scenes only, all 0..1 except burst
 *   getParticleCount()
 *
 * Listens: 'frame', 'resize', 'pointer:move', 'scene:progress'
 */

import * as THREE from 'three';
import { gsap } from 'gsap';
import { COLOURS, HERO_BREAK, MORPH, RED_SHARE, REPEL } from '../config/theme.js';
import { PARTICLE_FRAGMENT_SHADER, PARTICLE_VERTEX_SHADER } from '../shaders/particle-glsl.js';
import { hexToRgb, randomDirection, smoothstep } from '../utils/maths.js';

export function createParticleController({ events, render, stage, quality }) {
  const count = quality.particleCount;
  const reducedMotion = quality.reducedMotion;
  const geometry = createParticleGeometry(count);
  const material = createParticleMaterial(quality, render.getViewSize().pixelRatio);
  const uniforms = material.uniforms;
  const field = new THREE.Points(geometry, material);
  field.frustumCulled = false;
  field.renderOrder = 1; // drawn after the solid model so fading dots sit on top
  stage.add(field);

  let activeScene = null;
  let isFollowingScroll = false;
  let sceneProgress = 0;
  let viewSize = render.getViewSize();
  let pointer = { x: 0, y: 0, active: false };
  let morphTween = null;
  let wantedMorph = 1;

  events.on('resize', handleResize);
  events.on('pointer:move', (nextPointer) => {
    pointer = nextPointer;
  });
  events.on('scene:progress', handleSceneProgress);
  events.on('frame', updateFrame);

  function morphParticlesToShape(shape, scene, { followScroll = false } = {}) {
    if (!shape || shape.points.length !== count * 3) {
      console.warn('[kuga-energy-field] Shape has the wrong number of points; skipping.', scene && scene.id);
      return;
    }
    snapshotCurrentPositions();
    geometry.attributes.position.array.set(shape.points);
    geometry.attributes.position.needsUpdate = true;

    activeScene = scene;
    isFollowingScroll = followScroll;
    sceneProgress = 0;
    uniforms.uChargeOn.value = scene.effect === 'charge' ? 1 : 0;
    uniforms.uChargeStart.value = shape.chargeStart || 0;
    resetSceneEffects();
    applyTimedSceneProgress();
    startMorph();
  }

  function resetSceneEffects() {
    uniforms.uScatter.value = 0;
    uniforms.uSwirl.value = 0;
    uniforms.uBurst.value = 0;
    uniforms.uOpacity.value = 1;
    uniforms.uReveal.value = 1;
    uniforms.uTurbulence.value = reducedMotion ? 0 : activeScene.turbulence;
  }

  function startMorph() {
    if (morphTween) morphTween.kill();
    morphTween = null;
    render.requestRender();
    if (isFollowingScroll) {
      // aFrom now holds where every particle is, so morph 0 is "right here"; the limiter takes it on.
      uniforms.uMorph.value = reducedMotion ? 1 : 0;
      wantedMorph = uniforms.uMorph.value;
      return;
    }
    if (reducedMotion) {
      uniforms.uMorph.value = 1;
      return;
    }
    uniforms.uMorph.value = 0;
    morphTween = gsap.to(uniforms.uMorph, { value: 1, duration: MORPH.duration, ease: 'none' });
  }

  function setScrollState({ morph, opacity, burst, charge }) {
    if (!isFollowingScroll) return;
    wantedMorph = morph;
    if (reducedMotion) uniforms.uMorph.value = morph;
    uniforms.uOpacity.value = opacity;
    uniforms.uBurst.value = burst;
    uniforms.uReveal.value = reducedMotion ? 1 : charge;
    render.requestRender();
  }

  // Freezes where each particle is right now (morph, scatter and burst included) so the next
  // morph starts from there, even mid-way. Mirrors the shader in shaders/particle-glsl.js.
  function snapshotCurrentPositions() {
    const from = geometry.attributes.aFrom.array;
    const to = geometry.attributes.position.array;
    const delays = geometry.attributes.aDelay.array;
    const seeds = geometry.attributes.aSeed.array;
    const drifts = geometry.attributes.aDrift.array;
    const current = [0, 0, 0];

    for (let i = 0; i < count; i += 1) {
      const amount = getMorphAmount(uniforms.uMorph.value, delays[i]);
      for (let axis = 0; axis < 3; axis += 1) {
        const index = i * 3 + axis;
        current[axis] = from[index] + (to[index] - from[index]) * amount;
      }
      getSwirled(current, uniforms.uSwirl.value, seeds[i]);
      const burst = getBurstOffset(current, uniforms.uBurst.value, seeds[i]);
      const scatter = uniforms.uScatter.value * (0.4 + seeds[i]);
      for (let axis = 0; axis < 3; axis += 1) {
        from[i * 3 + axis] = current[axis] + burst[axis] + drifts[i * 3 + axis] * SCATTER_SHAPE[axis] * scatter;
      }
    }
    geometry.attributes.aFrom.needsUpdate = true;
  }

  function handleResize(nextViewSize) {
    viewSize = nextViewSize;
    uniforms.uPixelRatio.value = viewSize.pixelRatio;
  }

  function handleSceneProgress({ scene, progress }) {
    if (scene !== activeScene) return;
    sceneProgress = progress;
    applyTimedSceneProgress();
    render.requestRender();
  }

  // Timed scenes only: charge fill and the break into energy follow scroll through the section.
  function applyTimedSceneProgress() {
    if (!activeScene || isFollowingScroll) return;
    uniforms.uReveal.value = getChargeLevel();
    const breakAmount = reducedMotion ? 0 : activeScene.scatter * smoothstep(HERO_BREAK.range[0], HERO_BREAK.range[1], sceneProgress);
    uniforms.uScatter.value = breakAmount * HERO_BREAK.spread;
    uniforms.uSwirl.value = HERO_BREAK.swirl * breakAmount * breakAmount;
    uniforms.uTurbulence.value = reducedMotion ? 0 : activeScene.turbulence + HERO_BREAK.turbulence * breakAmount;
  }

  function getChargeLevel() {
    if (activeScene.effect !== 'charge') return 1;
    if (reducedMotion) return 1;
    return smoothstep(0.1, 0.7, sceneProgress);
  }

  function updateFrame({ time, delta }) {
    updatePointerPush(delta);
    if (isFollowingScroll && !reducedMotion) followWantedMorph(delta);
    if (!reducedMotion) uniforms.uTime.value = time;
  }

  function followWantedMorph(delta) {
    const gap = wantedMorph - uniforms.uMorph.value;
    if (gap === 0) return;
    const step = MORPH.maxRate * delta;
    uniforms.uMorph.value += Math.max(-step, Math.min(step, gap));
    render.requestRender();
  }

  function updatePointerPush(delta) {
    uniforms.uPointer.value.set((pointer.x * viewSize.width) / 2, (pointer.y * viewSize.height) / 2, 0);
    const wantedStrength = pointer.active && !reducedMotion ? REPEL.strength : 0;
    const strength = uniforms.uRepelStrength.value;
    uniforms.uRepelStrength.value = strength + (wantedStrength - strength) * Math.min(1, delta * 6);
  }

  return {
    morphParticlesToShape,
    setScrollState,
    getParticleCount: () => count,
  };
}

// --- Geometry and material -------------------------------------------------------

function createParticleGeometry(count) {
  const geometry = new THREE.BufferGeometry();
  const start = new Float32Array(count * 3);
  const from = new Float32Array(count * 3);
  const delay = new Float32Array(count);
  const order = new Float32Array(count);
  const seed = new Float32Array(count);
  const drift = new Float32Array(count * 3);
  const colour = new Float32Array(count * 3);
  const red = hexToRgb(COLOURS.red);
  const charcoal = hexToRgb(COLOURS.charcoal);

  for (let i = 0; i < count; i += 1) {
    const direction = randomDirection();
    start.set(direction.map((value) => value * 2), i * 3);
    from.set(direction.map((value) => value * 2), i * 3);
    drift.set(direction, i * 3);
    delay[i] = Math.random();
    order[i] = i / count;
    seed[i] = Math.random();
    colour.set(Math.random() < RED_SHARE ? red : charcoal, i * 3);
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(start, 3));
  geometry.setAttribute('aFrom', new THREE.BufferAttribute(from, 3));
  geometry.setAttribute('aDelay', new THREE.BufferAttribute(delay, 1));
  geometry.setAttribute('aOrder', new THREE.BufferAttribute(order, 1));
  geometry.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
  geometry.setAttribute('aDrift', new THREE.BufferAttribute(drift, 3));
  geometry.setAttribute('aColor', new THREE.BufferAttribute(colour, 3));
  return geometry;
}

function createParticleMaterial(quality, pixelRatio) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uMorph: { value: 1 },
      uSize: { value: quality.pointSize },
      uPixelRatio: { value: pixelRatio },
      uTurbulence: { value: 0.15 },
      uScatter: { value: 0 },
      uSwirl: { value: 0 },
      uBurst: { value: 0 },
      uOpacity: { value: 1 },
      uChargeOn: { value: 0 },
      uChargeStart: { value: 0 },
      uReveal: { value: 1 },
      uPointer: { value: new THREE.Vector3(999, 999, 0) },
      uRepelRadius: { value: REPEL.radius },
      uRepelStrength: { value: 0 },
      uHoverColor: { value: new THREE.Vector3(...hexToRgb(COLOURS.redHover)) },
    },
    vertexShader: PARTICLE_VERTEX_SHADER,
    fragmentShader: PARTICLE_FRAGMENT_SHADER,
    transparent: true,
    depthWrite: false,
    blending: THREE.NormalBlending, // additive glow disappears on a light background
  });
}

// --- Mirrors of the shader maths (for snapshots) -------------------------------------

function getMorphAmount(morph, delay) {
  const t = Math.min(1, Math.max(0, morph * (1 + MORPH.spread) - delay * MORPH.spread));
  return t * t * (3 - 2 * t);
}

const SCATTER_SHAPE = [1, 0.45, 1]; // mirrors SCATTER_SHAPE in shaders/particle-glsl.js

// Turns a point round the vertical axis through the shape centre, in place (mirrors getSwirled() in the shader).
function getSwirled(point, swirl, seed) {
  if (swirl === 0) return;
  const angle = swirl * (0.5 + seed);
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const x = point[0];
  point[0] = x * c + point[2] * s;
  point[2] = -x * s + point[2] * c;
}

function getBurstOffset(position, burst, seed) {
  if (burst === 0) return [0, 0, 0];
  const shifted = position.map((value) => value + 0.0001);
  const size = Math.hypot(shifted[0], shifted[1], shifted[2]) || 1;
  const strength = burst * (0.6 + seed * 0.8);
  return shifted.map((value) => (value / size) * strength);
}
