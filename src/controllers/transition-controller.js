/**
 * Transition controller
 * The ONE place that turns a product scene's scroll progress p (0..1) into phases and tells the
 * particle, solid model and shatter controllers what to show. Phase boundaries come from
 * PRODUCT_PHASES in config/theme.js.
 *
 *   converge  particles morph onto the product surface (battery: they also fill bottom to top)
 *   solidify  solid model dissolves in with a red edge, particles fade out
 *   hold      solid model on show with a gentle turn; callouts visible inside CALLOUTS.window,
 *             so they are fully in during the hold and fully gone before the shatter
 *   shatter   solid swaps to fragments that fly apart; particles fade back in and burst outwards
 *
 * Everything follows scroll, so scrolling back plays it in reverse. With reduced motion the
 * solid model is shown straight away: no particles, dissolve or shatter.
 * Non-product scenes (hero, flow, quote) are left to the particle controller.
 *
 * Public methods:
 *   enterScene(scene, shape)   call once the scene's shape is ready; shape.mesh marks a product
 *
 * Listens: 'scene:progress'
 * Emits:   'product:phase' { scene, phase }   phase = converge | solidify | hold | shatter | null
 *          'product:callouts' { scene, visible }
 */

import { CALLOUTS, PRODUCT_PHASES, SHATTER } from '../config/theme.js';
import { easeOutQuad, progressInRange, smoothstep } from '../utils/maths.js';

const PHASE_ORDER = ['converge', 'solidify', 'hold', 'shatter'];

export function createTransitionController({ events, particles, solid, shatter, reducedMotion }) {
  const latestProgress = new Map();
  let productScene = null;
  let announcedPhase = null;
  let announcedCallouts = null;

  events.on('scene:progress', handleSceneProgress);

  function enterScene(scene, shape) {
    if (!shape.mesh) {
      leaveProductScene(scene);
      return;
    }
    productScene = scene;
    solid.showProduct(scene.shape, shape.mesh);
    if (!reducedMotion) shatter.prepareProduct(scene.shape, shape.mesh);
    applyProgress(latestProgress.get(scene) || 0);
  }

  function leaveProductScene(scene) {
    productScene = null;
    solid.hide();
    shatter.hide();
    announcePhase(scene, null);
    announceCallouts(scene, false);
  }

  function handleSceneProgress({ scene, progress }) {
    latestProgress.set(scene, progress);
    if (scene !== productScene) return;
    applyProgress(progress);
  }

  function applyProgress(progress) {
    const state = reducedMotion ? getStillState() : getPhaseState(progress);
    particles.setScrollState(getParticleState(state));
    applySolidState(state);
    applyShatterState(state);
    announcePhase(productScene, state.phase);
    announceCallouts(productScene, reducedMotion || isCalloutTime(state));
  }

  function applySolidState(state) {
    solid.setVisible(state.solidify > 0 && state.shatter === 0);
    solid.setDissolve(state.solidify);
    solid.setHold(state.hold);
  }

  function applyShatterState(state) {
    if (reducedMotion) {
      shatter.hide();
      return;
    }
    shatter.setProgress(state.shatter);
  }

  function getParticleState(state) {
    return {
      morph: state.converge,
      opacity: getParticleOpacity(state),
      burst: easeOutQuad(state.shatter) * SHATTER.distance,
      charge: state.converge,
    };
  }

  function announcePhase(scene, phase) {
    if (phase === announcedPhase) return;
    announcedPhase = phase;
    events.emit('product:phase', { scene, phase });
  }

  function announceCallouts(scene, visible) {
    const key = scene && visible ? scene : null;
    if (key === announcedCallouts) return;
    announcedCallouts = key;
    events.emit('product:callouts', { scene, visible });
  }

  return { enterScene };
}

// How far through each phase p is (0..1 each), plus the name of the phase p is in.
function getPhaseState(progress) {
  const state = { phase: getPhaseName(progress) };
  PHASE_ORDER.forEach((name) => {
    state[name] = progressInRange(progress, PRODUCT_PHASES[name]);
  });
  return state;
}

function getPhaseName(progress) {
  const phase = PHASE_ORDER.find((name) => progress < PRODUCT_PHASES[name][1]);
  return phase || 'shatter';
}

// Callouts show inside CALLOUTS.window of the hold phase only.
function isCalloutTime(state) {
  if (state.phase !== 'hold') return false;
  return state.hold >= CALLOUTS.window[0] && state.hold <= CALLOUTS.window[1];
}

// Reduced motion: the finished solid model, nothing moving.
function getStillState() {
  return { phase: 'hold', converge: 1, solidify: 1, hold: 0, shatter: 0 };
}

// Visible while converging, fade out while the solid dissolves in, fade back in as it shatters.
function getParticleOpacity(state) {
  if (state.shatter > 0) return smoothstep(0, SHATTER.particleReturn, state.shatter);
  return 1 - state.solidify;
}
