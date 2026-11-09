// Entry point. Only creates the controllers and wires them together.
// All text lives in the HTML; all behaviour lives in src/controllers.

import { createEventBus } from './utils/events.js';
import { createRenderController } from './controllers/render-controller.js';
import { createLightingController } from './controllers/lighting-controller.js';
import { createStageController } from './controllers/stage-controller.js';
import { createInputController } from './controllers/input-controller.js';
import { createModelController } from './controllers/model-controller.js';
import { createParticleController } from './controllers/particle-controller.js';
import { createSolidModelController } from './controllers/solid-model-controller.js';
import { createShatterController } from './controllers/shatter-controller.js';
import { createTransitionController } from './controllers/transition-controller.js';
import { createOverlayController } from './controllers/overlay-controller.js';
import { createStoryController } from './controllers/story-controller.js';
import { createDirectorController } from './controllers/director-controller.js';
import { createCameraController } from './controllers/camera-controller.js';
import { createScrollSmoother } from './controllers/scroll-smoother.js';
import { createSnapController } from './controllers/snap-controller.js';
import { createAwardFocusController } from './controllers/award-focus-controller.js';
import { getBrakeZones, getRestRanges, readShotPlan } from './utils/shot-plan.js';

const MOUNT_ID = 'kuga-energy-field';

async function startEnergyField() {
  const root = document.getElementById(MOUNT_ID);
  if (!root) return;

  const events = createEventBus();
  const render = createRenderController({ root, events });
  const quality = render.getQuality();
  const { reducedMotion } = quality;

  createLightingController({ render, quality });
  createInputController({ events, enabled: !reducedMotion });
  createOverlayController({ root, events });

  const stage = createStageController({ events, render, reducedMotion }).getStage();
  if (!reducedMotion) createCameraController({ events, render });
  const models = createModelController({
    particleCount: quality.particleCount,
    textureSize: quality.textureSize,
    modelsUrl: getModelsUrl(root),
  });
  const particles = createParticleController({ events, render, stage, quality });
  const solid = createSolidModelController({ render, stage, quality });
  const shatter = createShatterController({ render, stage });
  const transition = createTransitionController({ events, particles, solid, shatter, reducedMotion });
  // One smoothed story position feeds the director, the scenes (transition, particles, stage) and the camera.
  const smoother = createScrollSmoother({ root, events, reducedMotion });
  const director = createDirectorController({ root, events, smoother });
  const story = createStoryController({ root, events, smoother });
  const shotPlan = readShotPlan(root);
  smoother.setBrakeZones(getBrakeZones(shotPlan));
  if (!reducedMotion) createSnapController({ events, smoother, restRanges: getRestRanges(shotPlan) });

  events.on('scene:change', async (scene) => {
    const shape = await models.getShapeForScene(scene);
    const isStillActive = story.getActiveScene() === scene;
    if (!isStillActive) return;
    events.emit('shape:ready', { scene, shape });
    particles.morphParticlesToShape(shape, scene, { followScroll: Boolean(shape.mesh) });
    transition.enterScene(scene, shape);
  });

  await models.loadManifest();
  render.start();
  director.start(); // sets the shot lengths, so it runs before the smoother measures the sections
  smoother.start();
  story.start();

  // Warm the model cache, then re-measure once models and fonts are in.
  const warmUp = story.getScenes().map((scene) => models.getShapeForScene(scene));
  Promise.allSettled([...warmUp, document.fonts.ready]).then(() => director.refresh());
  if (!reducedMotion) warmShatterFragments(story.getScenes(), models, shatter);
}

// Builds every product's shatter fragments while the browser is idle, one product at a time, so
// the first visit to a product scene (often during fast scrolling) does not stall the page.
async function warmShatterFragments(scenes, models, shatter) {
  for (const scene of scenes) {
    const shape = await models.getShapeForScene(scene);
    if (!shape.mesh) continue;
    await waitForIdle();
    shatter.warmProduct(scene.shape, shape.mesh);
  }
}

function waitForIdle() {
  return new Promise((resolve) => {
    if (window.requestIdleCallback) window.requestIdleCallback(() => resolve(), { timeout: 1500 });
    else setTimeout(resolve, 200);
  });
}

// Models sit next to src/ by default; Webflow can point elsewhere with data-models-url.
function getModelsUrl(root) {
  const custom = root.dataset.modelsUrl;
  if (custom) return new URL(custom.endsWith('/') ? custom : `${custom}/`, document.baseURI);
  return new URL('../models/', import.meta.url);
}

createAwardFocusController(); // plain DOM, works without WebGL
startEnergyField();
