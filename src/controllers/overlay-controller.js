/**
 * Overlay controller
 * Marks the active section and reveals its spec callouts ([data-callout]).
 * The reveal animation itself is CSS (see .is-active rules in main.css);
 * this file only switches classes and sets the stagger order.
 * Product scenes also get data-phase (converge | solidify | hold | shatter) and data-callouts
 * (on | off); CSS shows their callouts only while data-callouts is on (inside the hold phase).
 *
 * Public methods:
 *   showSceneCallouts(scene)
 *
 * Listens: 'scene:change', 'product:phase', 'product:callouts'
 */

export function createOverlayController({ root, events }) {
  const sections = Array.from(root.querySelectorAll('[data-scene]'));

  numberCalloutsForStagger();
  root.classList.add('kef--ready');
  events.on('scene:change', showSceneCallouts);
  events.on('product:phase', markProductPhase);
  events.on('product:callouts', ({ scene, visible }) => {
    if (scene) scene.element.dataset.callouts = visible ? 'on' : 'off';
  });

  function numberCalloutsForStagger() {
    sections.forEach((section) => {
      section.querySelectorAll('[data-callout]').forEach((callout, index) => {
        callout.style.setProperty('--callout-index', String(index));
      });
    });
  }

  function showSceneCallouts(scene) {
    sections.forEach((section) => section.classList.toggle('is-active', section === scene.element));
    root.dataset.activeScene = scene.id;
  }

  function markProductPhase({ scene, phase }) {
    if (!scene) return;
    if (!phase) {
      delete scene.element.dataset.phase;
      return;
    }
    scene.element.dataset.phase = phase;
  }

  return { showSceneCallouts };
}
