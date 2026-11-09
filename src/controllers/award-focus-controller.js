// Award focus: click (or Enter / Space) on an award badge and it grows from its place to fill the view,
// over a dimmed page, with its title and a link to the article. A click, a scroll, a swipe or Esc sends it
// back to its place. While it is open the scroll that closes it is swallowed, so the story does not move.
//
// Markup it reads (index.html, chapter 7):
//   <button data-award-focus data-award-title="..." data-award-by="..." data-award-href="(optional)">
//     <img> or <span class="kef-medal">   the badge itself; a copy of it is what grows
//   </button>
//
// Timings live in AWARD_FOCUS below.

import { gsap } from 'gsap';

const AWARD_FOCUS = {
  openDuration: 0.6,
  closeDuration: 0.45,
  captionDelay: 0.25,
};

const CLOSE_KEYS = new Set(['Escape', 'ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' ']);
const SCROLL_EVENTS = ['wheel', 'touchmove'];

export function createAwardFocusController({ root = document } = {}) {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let current = null; // { button, overlay, badge, opening, closing }

  root.querySelectorAll('[data-award-focus]').forEach((button) => {
    button.addEventListener('click', () => openFocus(button));
  });

  function openFocus(button) {
    if (current) return;
    const source = button.firstElementChild;
    const overlay = buildOverlay(button, source);
    document.body.append(overlay);
    const badge = overlay.querySelector('.kef-award-focus__badge');

    const timeline = gsap.timeline({ defaults: { duration: reducedMotion ? 0 : AWARD_FOCUS.openDuration } });
    timeline.from(overlay.querySelector('.kef-award-focus__backdrop'), { opacity: 0, ease: 'power2.out' }, 0);
    timeline.from(badge, { ...offsetFrom(source, badge), ease: 'power3.out' }, 0);
    timeline.from(
      overlay.querySelector('.kef-award-focus__caption'),
      { opacity: 0, y: 12, ease: 'power2.out' },
      reducedMotion ? 0 : AWARD_FOCUS.captionDelay,
    );

    current = { button, overlay, badge, opening: timeline, closing: false };
    button.style.visibility = 'hidden';
    addCloseListeners();

    const link = overlay.querySelector('a');
    (link || overlay.querySelector('.kef-award-focus__figure')).focus({ preventScroll: true });
  }

  function closeFocus() {
    if (!current || current.closing) return;
    current.closing = true;
    const { button, overlay, badge, opening } = current;
    opening.kill(); // closing mid-way through opening starts from wherever the badge is now
    removeCloseListeners();

    const timeline = gsap.timeline({
      defaults: { duration: reducedMotion ? 0 : AWARD_FOCUS.closeDuration },
      onComplete: () => {
        overlay.remove();
        button.style.visibility = '';
        button.focus({ preventScroll: true });
        current = null;
      },
    });
    timeline.to(overlay.querySelector('.kef-award-focus__caption'), { opacity: 0, duration: reducedMotion ? 0 : 0.15 }, 0);
    timeline.to(badge, { ...offsetFrom(button.firstElementChild, badge), ease: 'power3.inOut' }, 0);
    timeline.to(overlay.querySelector('.kef-award-focus__backdrop'), { opacity: 0, ease: 'power2.in' }, 0);
  }

  // A click anywhere closes, except on the article link (that one navigates).
  function onOverlayClick(event) {
    if (event.target.closest('a')) return;
    closeFocus();
  }

  // Runs before Lenis (capture phase on window), so the scroll that closes the view does not also move the story.
  function onScrollIntent(event) {
    event.preventDefault();
    event.stopImmediatePropagation();
    closeFocus();
  }

  function onKey(event) {
    if (!CLOSE_KEYS.has(event.key)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    closeFocus();
  }

  function addCloseListeners() {
    current.overlay.addEventListener('click', onOverlayClick);
    SCROLL_EVENTS.forEach((type) => window.addEventListener(type, onScrollIntent, { capture: true, passive: false }));
    window.addEventListener('keydown', onKey, { capture: true });
  }

  function removeCloseListeners() {
    current.overlay.removeEventListener('click', onOverlayClick);
    SCROLL_EVENTS.forEach((type) => window.removeEventListener(type, onScrollIntent, { capture: true }));
    window.removeEventListener('keydown', onKey, { capture: true });
  }
}

// The overlay: backdrop, the badge copy and its caption. Text comes from the button's data attributes.
function buildOverlay(button, source) {
  const { awardTitle = '', awardBy = '', awardHref = '' } = button.dataset;
  const overlay = document.createElement('div');
  overlay.className = 'kef-award-focus';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', `${awardTitle}, ${awardBy}`);
  overlay.innerHTML = `
    <div class="kef-award-focus__backdrop"></div>
    <figure class="kef-award-focus__figure" tabindex="-1">
      <div class="kef-award-focus__badge"></div>
      <figcaption class="kef-award-focus__caption">
        <span class="kef-award-focus__title"></span>
        <span class="kef-award-focus__by"></span>
      </figcaption>
    </figure>`;
  overlay.querySelector('.kef-award-focus__title').textContent = awardTitle;
  overlay.querySelector('.kef-award-focus__by').textContent = awardBy;
  if (awardHref) {
    const link = document.createElement('a');
    link.className = 'kef-award-focus__link';
    link.href = awardHref;
    link.textContent = 'Read about this award';
    overlay.querySelector('.kef-award-focus__caption').append(link);
  }

  const copy = source.cloneNode(true);
  copy.removeAttribute('loading');
  copy.setAttribute('alt', '');
  overlay.querySelector('.kef-award-focus__badge').append(copy);
  return overlay;
}

// x / y / scale that put the big badge exactly over the small one (transform-origin is its top-left corner).
function offsetFrom(small, big) {
  const from = small.getBoundingClientRect();
  gsap.set(big, { clearProps: 'transform' });
  const to = big.getBoundingClientRect();
  gsap.set(big, { x: 0, y: 0, scale: 1 });
  return { x: from.left - to.left, y: from.top - to.top, scale: from.width / to.width };
}
