// [data-parallax]: the first child (an image) drifts inside its frame as the frame crosses the
// screen. The move follows an eased, velocity-aware follower, so it never jumps on a fast flick.
// data-parallax="4" overrides the shift (% of image height). Off with reduced motion.

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { PARALLAX } from './config.js';
import { createFollower } from './follower.js';
import { getScrollSpeed } from './scroll-speed.js';

export function setupParallax(mode) {
  if (mode.reduced) return () => {};
  const items = [...document.querySelectorAll('[data-parallax]')]
    .filter((frame) => frame.firstElementChild)
    .map((frame) => createItem(frame, mode));
  if (!items.length) return () => {};

  function tick(time, deltaMs) {
    const seconds = Math.min(deltaMs / 1000, 0.1);
    items.forEach((item) => {
      const progress = item.follower.update(item.trigger.progress, getScrollSpeed(), seconds);
      item.setY((progress - 0.5) * 2 * item.shift);
    });
  }
  gsap.ticker.add(tick);
  return () => gsap.ticker.remove(tick);
}

function createItem(frame, mode) {
  const image = frame.firstElementChild;
  const shift = Number(frame.dataset.parallax) || (mode.phone ? PARALLAX.shiftPhone : PARALLAX.shift);
  gsap.set(image, { scale: PARALLAX.scale, transformOrigin: '50% 50%' });
  const trigger = ScrollTrigger.create({ trigger: frame, start: 'top bottom', end: 'bottom top' });
  const item = { trigger, shift, follower: createFollower(trigger.progress), setY: gsap.quickSetter(image, 'yPercent') };
  item.setY((trigger.progress - 0.5) * 2 * shift);
  return item;
}
