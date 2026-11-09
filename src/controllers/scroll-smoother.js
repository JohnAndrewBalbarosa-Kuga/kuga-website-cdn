/**
 * Scroll smoother
 * Sits between the real scroll and everything that follows it. Runs Lenis smooth scrolling, turns
 * the scroll into a "story position" (0 at the top of the page, +1 per [data-scene] shot) and every
 * frame moves the SHOWN position toward it:
 *   - a lerp plus a most-per-second cap, both lower the faster the visitor scrolls (SMOOTHING)
 *   - brake zones: transitions (wipes, flash cuts, product phases) take at least a set time (BRAKES)
 *   - skipping: if the scroll runs several shots ahead quickly, a veil dissolves straight to the
 *     destination instead of flashing every shot in between (JUMP)
 * With reduced motion there is no Lenis and the shown position is the scroll position.
 * Tunables: config/story-timing.js.
 *
 * Public methods:
 *   start()                       begin (call after the director has set the shot lengths)
 *   setBrakeZones(zones)          [{ from, to, seconds }] in story positions (utils/shot-plan.js)
 *   getPosition()                 shown story position
 *   getTarget()                   story position of the real scroll
 *   getMaxPosition()              story position at the bottom of the page
 *   isJumping()                   true while the veil covers a skip (until it lands)
 *   scrollToPosition(position, { duration, easing, onComplete })   eased scroll (Lenis)
 *
 * Listens: 'frame'
 * Emits:   'scroll:position' { position, target, speed }   whenever either moves
 *          'scroll:jump' { position }                      the moment a veil dissolve lands
 */

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { JUMP, LENIS, SMOOTHING } from '../config/story-timing.js';
import { clamp01, smoothstep } from '../utils/maths.js';

const SETTLED = 0.00005; // gaps smaller than this (shots) count as caught up

export function createScrollSmoother({ root, events, reducedMotion }) {
  const sections = Array.from(root.querySelectorAll('[data-scene]'));
  const triggers = [];
  const recentTargets = [];
  let lenis = null;
  let veil = null;
  let zones = [];
  let target = 0;
  let shown = 0;
  let speed = 0;
  let lastScroll = null;
  let jumping = false; // veil covering
  let revealing = false; // veil fading off after landing
  let lastEmitted = { shown: null, target: null };

  function start() {
    gsap.registerPlugin(ScrollTrigger);
    if (!reducedMotion) {
      lenis = startLenis(root);
      veil = makeVeil(root);
    }
    // Same trigger lines as the scenes always had: the first from the top of the page, the rest
    // when their top crosses the middle of the screen. Used for measuring only.
    sections.forEach((section, index) => {
      triggers.push(ScrollTrigger.create({ trigger: section, start: index === 0 ? 'top top' : 'top center', end: 'bottom center' }));
    });
    ScrollTrigger.refresh();
    target = toPosition(window.scrollY);
    shown = target;
    events.on('frame', update);
    emitPosition();
  }

  function update({ delta }) {
    if (delta <= 0) return;
    const scroll = window.scrollY;
    measureSpeed(scroll, delta);
    target = toPosition(scroll);
    rememberTarget(target);

    if (reducedMotion) {
      shown = target;
    } else {
      if (!jumping && !revealing && shouldJump()) startJump();
      shown = stepToward(shown, target, delta);
    }
    emitPosition();
  }

  // Scroll speed in screens per second: rises at once, falls off gently (speedDecay).
  function measureSpeed(scroll, delta) {
    const measured = lastScroll === null ? 0 : Math.abs(scroll - lastScroll) / delta / window.innerHeight;
    lastScroll = scroll;
    speed = Math.max(measured, speed * Math.pow(SMOOTHING.speedDecay, delta));
  }

  function stepToward(from, to, delta) {
    const gap = to - from;
    if (Math.abs(gap) < SETTLED) return to;
    const fast = smoothstep(SMOOTHING.slowSpeed, SMOOTHING.fastSpeed, speed);
    const lerp = mix(SMOOTHING.calm.lerp, SMOOTHING.fast.lerp, fast);
    const maxRate = mix(SMOOTHING.calm.maxRate, SMOOTHING.fast.maxRate, fast);
    let step = gap * (1 - Math.pow(1 - lerp, delta * 60));
    const cap = Math.min(maxRate, getBrakeRate(from), getBrakeRate(from + step)) * delta;
    step = Math.max(-cap, Math.min(cap, step));
    return from + step;
  }

  // The slowest rate any brake zone at this position allows (shots per second).
  function getBrakeRate(position) {
    let rate = Infinity;
    zones.forEach(({ from, to, seconds }) => {
      if (position >= from && position <= to && seconds > 0) rate = Math.min(rate, (to - from) / seconds);
    });
    return rate;
  }

  // --- Skipping: dissolve through the veil ------------------------------------------------

  function rememberTarget(position) {
    const now = performance.now();
    recentTargets.push({ time: now, position });
    // Keep one sample at or just past the window as the baseline, so a long frame still counts.
    while (recentTargets.length > 2 && now - recentTargets[1].time > JUMP.windowMs) recentTargets.shift();
  }

  function shouldJump() {
    if (Math.abs(target - shown) < JUMP.gap) return false;
    const travelled = Math.abs(target - recentTargets[0].position);
    return travelled >= JUMP.gap;
  }

  function startJump() {
    jumping = true;
    gsap.to(veil, {
      autoAlpha: 1,
      duration: JUMP.coverDuration,
      ease: 'power1.in',
      overwrite: true,
      onComplete: landJump,
    });
  }

  function landJump() {
    jumping = false;
    revealing = true;
    shown = target;
    recentTargets.length = 0;
    emitPosition();
    events.emit('scroll:jump', { position: shown });
    gsap.to(veil, {
      autoAlpha: 0,
      duration: JUMP.revealDuration,
      delay: JUMP.holdDuration,
      ease: 'power2.out',
      overwrite: true,
      onComplete: () => {
        revealing = false;
      },
    });
  }

  function emitPosition() {
    if (shown === lastEmitted.shown && target === lastEmitted.target) return;
    lastEmitted = { shown, target };
    events.emit('scroll:position', { position: shown, target, speed });
  }

  // --- Scroll <-> story position ------------------------------------------------------------

  function toPosition(scroll) {
    if (triggers.length === 0) return 0;
    for (let index = 0; index < triggers.length; index += 1) {
      const { start, end } = triggers[index];
      if (scroll < end || index === triggers.length - 1) {
        return index + clamp01((scroll - start) / Math.max(1, end - start));
      }
    }
    return triggers.length;
  }

  function toScroll(position) {
    if (triggers.length === 0) return 0;
    const index = Math.min(triggers.length - 1, Math.max(0, Math.floor(position)));
    const { start, end } = triggers[index];
    return start + (end - start) * clamp01(position - index);
  }

  function scrollToPosition(position, { duration, easing, onComplete } = {}) {
    const scroll = Math.round(toScroll(position));
    if (!lenis) {
      window.scrollTo(0, scroll);
      if (onComplete) onComplete();
      return;
    }
    lenis.scrollTo(scroll, { duration, easing, onComplete });
  }

  return {
    start,
    setBrakeZones: (nextZones) => {
      zones = nextZones || [];
    },
    getPosition: () => shown,
    getTarget: () => target,
    getMaxPosition: () => toPosition(ScrollTrigger.maxScroll(window)),
    isJumping: () => jumping,
    scrollToPosition,
  };
}

function mix(from, to, amount) {
  return from + (to - from) * amount;
}

function startLenis(root) {
  const lenis = new Lenis({
    lerp: LENIS.lerp,
    wheelMultiplier: LENIS.wheelMultiplier,
    touchMultiplier: LENIS.touchMultiplier,
  });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
  routeAnchorLinksThroughLenis(root, lenis);
  return lenis;
}

// In-page links (e.g. "#quote") scroll smoothly instead of jumping.
function routeAnchorLinksThroughLenis(root, lenis) {
  root.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener('click', (event) => {
      const href = link.getAttribute('href');
      if (href.length < 2) return;
      const destination = document.getElementById(href.slice(1));
      if (!destination) return;
      event.preventDefault();
      lenis.scrollTo(destination);
    });
  });
}

// Full-screen layer in the page colour that the skip dissolve passes through.
function makeVeil(root) {
  const veil = document.createElement('div');
  veil.className = 'kef-veil';
  veil.setAttribute('aria-hidden', 'true');
  root.appendChild(veil);
  return veil;
}
