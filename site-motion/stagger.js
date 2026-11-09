// [data-stagger]: the children (cards, facts, gallery photos) come in one after another as they
// scroll into view, once. Reduced motion: fade only.

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { STAGGER } from './config.js';

export function setupStagger(mode) {
  const items = [...document.querySelectorAll('[data-stagger]')].flatMap((list) => [...list.children]);
  if (!items.length) return;
  const from = mode.reduced
    ? { opacity: 0 }
    : { opacity: 0, y: mode.phone ? STAGGER.yPhone : STAGGER.y, scale: STAGGER.scale };

  gsap.set(items, from);
  ScrollTrigger.batch(items, {
    start: STAGGER.start,
    once: true,
    onEnter: (batch) => gsap.to(batch, {
      opacity: 1,
      y: 0,
      scale: 1,
      duration: STAGGER.duration,
      ease: STAGGER.ease,
      stagger: STAGGER.stagger,
      overwrite: true,
    }),
  });
}
