// The visitor's current motion mode, read live (for click handlers outside gsap.matchMedia).

import { MEDIA } from './config.js';

export function currentMode() {
  return {
    reduced: window.matchMedia(MEDIA.reduced).matches,
    phone: window.matchMedia(MEDIA.phone).matches,
  };
}
