/**
 * Story controller
 * Reads every [data-scene] section from the page and turns the smoothed story position from the
 * scroll smoother (0 at the top, +1 per section) into the active scene and its progress.
 * Scenes therefore follow the eased scroll, never the raw one.
 *
 * Section attributes it reads (all optional except data-scene and data-shape):
 *   data-scene="battery"          unique scene name
 *   data-shape="battery"          logo-text | flow | gather | a product id from config/products.js
 *   data-shape-text="KUGA"        word for data-shape="logo-text"
 *   data-shape-side="right"       right (default) | centre | full
 *   data-shape-phone="top"        full shapes only: keep to the top band on narrow screens
 *   data-rotate="true"            turn the shape as you scroll
 *   data-effect="charge"          fill the shape like a charge bar
 *   data-scatter="1"              break the shape apart (HERO_BREAK in config/theme.js)
 *   data-turbulence="0.2"         how much the particles drift
 *   data-gather-target="selector" element the particles gather round (data-shape="gather")
 *
 * Public methods:
 *   start()           begin following the smoother (emits the first scene straight away)
 *   getScenes()       -> scene objects in page order
 *   getActiveScene()  -> current scene or null
 *
 * Listens: 'scroll:position'
 * Emits: 'scene:change' scene, 'scene:progress' { scene, progress }
 */

import { clamp01 } from '../utils/maths.js';

export function createStoryController({ root, events, smoother }) {
  const scenes = Array.from(root.querySelectorAll('[data-scene]')).map(readSceneFromSection);
  let activeScene = null;
  let lastProgress = null;

  function start() {
    events.on('scroll:position', ({ position }) => follow(position));
    follow(smoother.getPosition());
  }

  function follow(position) {
    if (scenes.length === 0) return;
    const index = Math.min(scenes.length - 1, Math.max(0, Math.floor(position)));
    const progress = clamp01(position - index);
    setActiveScene(scenes[index]);
    if (progress === lastProgress) return;
    lastProgress = progress;
    events.emit('scene:progress', { scene: activeScene, progress });
  }

  function setActiveScene(scene) {
    if (scene === activeScene) return;
    activeScene = scene;
    lastProgress = null;
    events.emit('scene:change', scene);
  }

  return {
    start,
    getScenes: () => scenes,
    getActiveScene: () => activeScene,
  };
}

function readSceneFromSection(section, index) {
  const data = section.dataset;
  const gatherTarget = data.gatherTarget ? section.querySelector(data.gatherTarget) : null;
  return {
    id: data.scene || `scene-${index}`,
    index,
    element: section,
    shape: data.shape || 'flow',
    shapeText: data.shapeText || '',
    side: data.shapeSide || 'right',
    phoneSide: data.shapePhone || '',
    rotate: data.rotate === 'true',
    effect: data.effect || '',
    scatter: readNumber(data.scatter, 0),
    turbulence: readNumber(data.turbulence, 0.15),
    targetElement: gatherTarget,
  };
}

function readNumber(value, fallback) {
  const number = parseFloat(value);
  return Number.isFinite(number) ? number : fallback;
}
