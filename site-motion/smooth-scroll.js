// Lenis smooth scrolling, tied to GSAP's ticker and ScrollTrigger. The smoothing eases down
// while the page moves fast (SCROLL in config.js). Same-page links (#id) glide through Lenis.
// Not used with reduced motion. Returns a cleanup function.

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { SCROLL } from './config.js';
import { getScrollSpeed } from './scroll-speed.js';

export function setupSmoothScroll(mode) {
  if (mode.reduced) return () => {};

  const lenis = new Lenis({
    lerp: SCROLL.lerp,
    wheelMultiplier: SCROLL.wheelMultiplier,
    touchMultiplier: SCROLL.touchMultiplier,
  });
  lenis.on('scroll', ScrollTrigger.update);

  function tick(time) {
    lenis.options.lerp = lerpForSpeed(getScrollSpeed());
    lenis.raf(time * 1000);
  }
  gsap.ticker.add(tick);
  gsap.ticker.lagSmoothing(0);

  function onClick(event) {
    const link = event.target.closest('a[href^="#"]');
    if (!link || event.defaultPrevented) return;
    const target = document.getElementById(decodeURIComponent(link.getAttribute('href').slice(1)));
    if (!target) return;
    event.preventDefault();
    lenis.scrollTo(target, { offset: -headerHeight() });
    target.setAttribute('tabindex', target.getAttribute('tabindex') || '-1');
    target.focus({ preventScroll: true });
  }
  document.addEventListener('click', onClick);

  return () => {
    document.removeEventListener('click', onClick);
    gsap.ticker.remove(tick);
    lenis.destroy();
  };
}

function lerpForSpeed(speed) {
  const [slowFrom, slowTo] = SCROLL.fastVelocity;
  const fastShare = Math.min(1, Math.max(0, (Math.abs(speed) - slowFrom) / (slowTo - slowFrom)));
  return SCROLL.lerp + (SCROLL.lerpFast - SCROLL.lerp) * fastShare;
}

function headerHeight() {
  const header = document.querySelector('.kt-header');
  return header ? header.offsetHeight : 0;
}
