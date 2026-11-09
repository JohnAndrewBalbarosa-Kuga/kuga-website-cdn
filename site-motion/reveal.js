// [data-reveal] and [data-reveal-group]: fade up once as they scroll into view.
// data-reveal="0.3" adds a delay in seconds. A group reveals each direct child; a child that is a
// <section> has its own children revealed instead. Nothing is hidden again on the way back up,
// so fast scrolling cannot make anything blink. Reduced motion: fade only.

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { REVEAL } from './config.js';

export function setupReveals(mode) {
  const items = [...document.querySelectorAll('[data-reveal]'), ...groupItems()];
  if (!items.length) return;
  const y = mode.reduced ? 0 : mode.phone ? REVEAL.yPhone : REVEAL.y;

  gsap.set(items, { opacity: 0, y });
  ScrollTrigger.batch(items, {
    start: REVEAL.start,
    once: true,
    onEnter: (batch) => gsap.to(batch, {
      opacity: 1,
      y: 0,
      duration: REVEAL.duration,
      ease: REVEAL.ease,
      stagger: REVEAL.stagger,
      delay: (index, element) => Number(element.dataset.reveal) || 0,
      overwrite: true,
    }),
  });
}

function groupItems() {
  return [...document.querySelectorAll('[data-reveal-group]')].flatMap((group) =>
    [...group.children].flatMap((child) => (child.tagName === 'SECTION' ? [...child.children] : [child])));
}
