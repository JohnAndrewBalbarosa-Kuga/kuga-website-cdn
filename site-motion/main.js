// Inner-page motion: entry point. Wires the small modules below to the data attributes in the
// HTML (see README.md). It holds no copy and no settings (config.js holds those).
//
// gsap.matchMedia() runs the scroll and reveal effects once per mode (full motion or reduced,
// desktop or phone) and undoes them when the mode changes. Click handlers (page transition,
// FAQ, projects filter) are set once and read the mode when clicked. The 3D product hero loads
// last, when the browser is idle after the first paint.

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { Flip } from 'gsap/Flip';
import { MEDIA, PRODUCT_HERO } from './config.js';
import { currentMode } from './mode.js';
import { startScrollSpeed } from './scroll-speed.js';
import { setupSmoothScroll } from './smooth-scroll.js';
import { setupPageTransition } from './page-transition.js';
import { setupKineticText } from './kinetic-text.js';
import { setupReveals } from './reveal.js';
import { setupStagger } from './stagger.js';
import { setupCounters } from './counters.js';
import { setupParallax } from './parallax.js';
import { setupFaq } from './faq.js';
import { setupProjectFilter } from './project-filter.js';

const root = document.documentElement;
// The head snippet gives up after a few seconds and shows everything (.sm-failed). If this script
// arrives later than that, skip the entrances rather than hide visible text again.
const lateStart = root.classList.contains('sm-failed');
root.classList.add('sm-ready');

gsap.registerPlugin(ScrollTrigger, SplitText, Flip);
startScrollSpeed();

const arrivalTime = setupPageTransition();
setupFaq();
setupProjectFilter();

// "full" is listed so that one condition always matches (matchMedia only runs when one does).
gsap.matchMedia().add({ full: MEDIA.full, reduced: MEDIA.reduced, phone: MEDIA.phone }, (context) => {
  const mode = { reduced: context.conditions.reduced, phone: context.conditions.phone };
  const stopScroll = setupSmoothScroll(mode);
  const stopParallax = setupParallax(mode);
  if (!lateStart) {
    setupKineticText(mode, arrivalTime);
    setupReveals(mode);
    setupStagger(mode);
    setupCounters(mode);
  }
  return () => {
    stopParallax();
    stopScroll();
  };
});

// Layout can still move once the web font is in; re-measure the triggers then.
if (document.fonts) document.fonts.ready.then(() => ScrollTrigger.refresh());

if (document.querySelector('[data-product-hero]')) whenIdle(loadProductHero);

function loadProductHero() {
  import('./product-hero.js')
    .then(({ startProductHeroes }) => startProductHeroes(currentMode()))
    .catch((error) => {
      document.querySelectorAll('[data-product-hero]').forEach((container) => { container.hidden = true; });
      console.info(`[site-motion] 3D product hero skipped: ${error.message}`);
    });
}

function whenIdle(callback) {
  const start = () => (window.requestIdleCallback
    ? window.requestIdleCallback(callback, { timeout: PRODUCT_HERO.idleTimeout })
    : setTimeout(callback, 200));
  if (document.readyState === 'complete') start();
  else window.addEventListener('load', start, { once: true });
}
