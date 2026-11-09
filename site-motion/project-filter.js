// [data-filter-list]: on the Projects listing, the filter links ([data-filter]) re-filter the cards
// in place: remaining cards glide to their new spots (GSAP Flip), new ones fade in, removed ones
// fade out, and the address bar keeps the ?solution= / ?size= query. The matching rule itself is
// window.kugaFilterProjects(query) from the page's own inline script, so it lives in one place.
// Without this module the links simply load the filtered URL. Reduced motion: a quick fade.

import { gsap } from 'gsap';
import { Flip } from 'gsap/Flip';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { FILTER } from './config.js';
import { currentMode } from './mode.js';

export function setupProjectFilter() {
  const list = document.querySelector('[data-filter-list]');
  if (!list || typeof window.kugaFilterProjects !== 'function') return;

  document.querySelectorAll('[data-filter]').forEach((link) => {
    link.addEventListener('click', (event) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      history.replaceState(history.state, '', link.href);
      applyFilter(list, link.dataset.filter);
    });
  });
}

function applyFilter(list, query) {
  const cards = [...list.children];
  if (currentMode().reduced) {
    gsap.fromTo(list, { opacity: 0.4 }, { opacity: 1, duration: FILTER.fade });
    window.kugaFilterProjects(query);
    showAll(cards);
    ScrollTrigger.refresh();
    return;
  }
  const state = Flip.getState(cards, { props: 'opacity' });
  window.kugaFilterProjects(query);
  showAll(cards.filter((card) => !card.hidden));
  Flip.from(state, {
    duration: FILTER.duration,
    ease: FILTER.ease,
    absoluteOnLeave: true,
    onEnter: (entering) => gsap.fromTo(entering, { opacity: 0, scale: 0.96 }, { opacity: 1, scale: 1, duration: FILTER.fade, delay: FILTER.duration * 0.4 }),
    onLeave: (leaving) => gsap.to(leaving, { opacity: 0, scale: 0.96, duration: FILTER.fade }),
    onComplete: () => ScrollTrigger.refresh(),
  });
}

// Cards may still carry the hidden start state of their stagger entrance; filtered cards show at once.
function showAll(cards) {
  gsap.killTweensOf(cards);
  gsap.set(cards, { opacity: 1, y: 0, scale: 1 });
}
