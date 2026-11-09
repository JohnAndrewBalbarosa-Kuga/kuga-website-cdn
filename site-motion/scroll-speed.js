// Tracks how fast the page is scrolling (px per second, smoothed), whatever moves it:
// Lenis, the keyboard, a scrollbar drag or an anchor jump.

import { gsap } from 'gsap';

const SMOOTHING = 0.25;
let lastY = 0;
let speed = 0;
let started = false;

export function startScrollSpeed() {
  if (started) return;
  started = true;
  lastY = window.scrollY;
  gsap.ticker.add(measure);
}

export function getScrollSpeed() {
  return speed;
}

function measure(time, deltaMs) {
  const seconds = Math.max(deltaMs / 1000, 1 / 240);
  const y = window.scrollY;
  const raw = (y - lastY) / seconds;
  lastY = y;
  speed += (raw - speed) * SMOOTHING;
}
