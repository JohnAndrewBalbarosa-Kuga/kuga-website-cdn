/**
 * Snap controller
 * When scrolling stops outside a finished frame, eases the page to the nearest rest point, so a
 * stop never leaves a half-dissolved model, half-shattered fragments, a wipe mid-screen or
 * half-shown copy. Rest ranges come from utils/shot-plan.js (each product's hold, each text shot
 * from its copy fully in to its copy leaving, SHOTS.<id>.rest overrides).
 * Waits SNAP.delay seconds of stillness first, so it never fights the visitor. Stands down after
 * keyboard scrolling (until the next wheel or touch), while a pointer is held (scrollbar drags)
 * and while the skip-dissolve veil is covering. Not created with reduced motion.
 * Tunables: SNAP in config/story-timing.js.
 *
 * Public methods: none.
 * Listens: 'frame'
 */

import { SNAP } from '../config/story-timing.js';

const KEYBOARD_SCROLL_KEYS = ['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' ', 'Space', 'Spacebar'];
const MOVED = 0.00002; // target moves smaller than this (shots) count as still
const INSIDE = 0.004; // snap this far inside a range edge (shots), so pixel rounding lands inside

export function createSnapController({ events, smoother, restRanges }) {
  let stillFor = 0;
  let lastTarget = null;
  let direction = 0;
  let snappingUntil = 0;
  let keyboardInControl = false;
  let pointerHeld = false;

  window.addEventListener('keydown', (event) => {
    if (KEYBOARD_SCROLL_KEYS.includes(event.key)) keyboardInControl = true;
  });
  const handBack = () => {
    keyboardInControl = false;
    snappingUntil = 0; // the visitor took over from a snap
  };
  window.addEventListener('wheel', handBack, { passive: true });
  window.addEventListener('touchstart', handBack, { passive: true });
  window.addEventListener('pointerdown', () => {
    pointerHeld = true;
  });
  ['pointerup', 'pointercancel', 'blur'].forEach((name) => window.addEventListener(name, () => {
    pointerHeld = false;
  }));
  events.on('frame', update);

  function update({ delta }) {
    const target = smoother.getTarget();
    const now = performance.now();
    if (lastTarget === null || Math.abs(target - lastTarget) > MOVED) {
      if (lastTarget !== null && now > snappingUntil) direction = Math.sign(target - lastTarget);
      lastTarget = target;
      stillFor = 0;
      return;
    }
    stillFor += delta;
    if (stillFor < SNAP.delay || now < snappingUntil) return;
    if (keyboardInControl || pointerHeld || smoother.isJumping()) return;

    const destination = findRestPoint(target);
    if (destination === null) return;
    snappingUntil = now + SNAP.duration * 1000 + 200;
    smoother.scrollToPosition(destination, { duration: SNAP.duration, easing: easeInOutCubic });
  }

  // null when position is already on a finished frame; else the nearest rest range edge,
  // favouring the direction the visitor was scrolling.
  function findRestPoint(position) {
    const maxPosition = smoother.getMaxPosition();
    let best = null;
    let bestScore = Infinity;
    for (const [rangeFrom, rangeTo] of restRanges) {
      const from = Math.min(rangeFrom, maxPosition);
      const to = Math.min(rangeTo, maxPosition);
      if (position >= from - MOVED && position <= to + MOVED) return null;
      if (to <= from && rangeFrom > maxPosition) continue; // range not reachable
      const edge = position < from ? Math.min(from + INSIDE, to) : Math.max(to - INSIDE, from);
      const score = Math.abs(edge - position) * (Math.sign(edge - position) === direction ? SNAP.forwardBias : 1);
      if (score < bestScore) {
        bestScore = score;
        best = edge;
      }
    }
    return best;
  }
}

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
