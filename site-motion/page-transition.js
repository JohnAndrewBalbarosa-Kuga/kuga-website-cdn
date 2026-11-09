// [data-page-wipe]: a charcoal panel with a Kuga-red edge (as on the homepage) wipes over the page
// when an internal link is followed, and wipes off the next page. Desktop: left to right. Phone:
// bottom to top. Reduced motion: a short fade. The head snippet (site-motion-head.html) marks the
// next page "sm-arriving" so the panel already covers it at the first paint.
// Links opt out with data-no-transition (also skipped: new tabs, downloads, other sites,
// same-page anchors and modified clicks).

import { gsap } from 'gsap';
import { TRANSITION } from './config.js';
import { currentMode } from './mode.js';

const root = document.documentElement;

export function setupPageTransition() {
  const panel = document.querySelector('[data-page-wipe]');
  if (!panel) return 0;
  document.addEventListener('click', (event) => onClick(event, panel));
  window.addEventListener('pageshow', (event) => {
    if (event.persisted) park(panel);   // back/forward cache: never come back covered
  });
  return arrive(panel);
}

// Uncovers the page if it arrived through a wipe. Returns how long that takes (seconds).
function arrive(panel) {
  if (!root.classList.contains('sm-arriving')) {
    park(panel);
    return 0;
  }
  const { reduced, phone } = currentMode();
  gsap.set(panel, { x: 0, y: 0, xPercent: 0, yPercent: 0, opacity: 1 });
  root.classList.remove('sm-arriving');
  const exit = reduced ? { opacity: 0 } : phone ? { yPercent: -101 } : { xPercent: 101 };
  gsap.to(panel, {
    ...exit,
    duration: reduced ? TRANSITION.fade : TRANSITION.uncover,
    ease: TRANSITION.ease,
    onComplete: () => park(panel),
  });
  return reduced ? TRANSITION.fade : TRANSITION.uncover * 0.6;
}

function onClick(event, panel) {
  const link = event.target.closest('a[href]');
  if (!link || !followsWithWipe(event, link)) return;
  event.preventDefault();
  const { reduced, phone } = currentMode();
  const go = () => { window.location.href = link.href; };
  try { sessionStorage.setItem(TRANSITION.storageKey, String(Date.now())); } catch (error) { /* private mode: no wipe on arrival */ }
  const failSafe = setTimeout(go, TRANSITION.failSafe * 1000);
  const from = reduced ? { opacity: 0 } : phone ? { yPercent: 101 } : { xPercent: -101 };
  gsap.fromTo(panel, { x: 0, y: 0, xPercent: 0, yPercent: 0, opacity: 1, ...from }, {
    xPercent: 0, yPercent: 0, opacity: 1,
    duration: reduced ? TRANSITION.fade : TRANSITION.cover,
    ease: TRANSITION.ease,
    onComplete: () => { clearTimeout(failSafe); go(); },
  });
}

function followsWithWipe(event, link) {
  if (event.defaultPrevented || event.button !== 0) return false;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false;
  if (link.target && link.target !== '_self') return false;
  if (link.hasAttribute('download') || link.hasAttribute('data-no-transition')) return false;
  const url = new URL(link.href, window.location.href);
  if (url.origin !== window.location.origin) return false;
  const samePage = url.pathname === window.location.pathname && url.search === window.location.search;
  return !samePage;
}

// Off screen and invisible, ready for the next link.
function park(panel) {
  gsap.set(panel, { x: 0, y: 0, xPercent: 0, yPercent: 0, opacity: 0 });
}
