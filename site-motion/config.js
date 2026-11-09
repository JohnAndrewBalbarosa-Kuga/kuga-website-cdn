// Every tunable of the inner-page motion in one place. Times are seconds, distances pixels
// unless a comment says otherwise. Eases are GSAP ease names.

// Media queries used by gsap.matchMedia() and by click handlers that check the mode live.
export const MEDIA = {
  reduced: '(prefers-reduced-motion: reduce)',
  full: '(prefers-reduced-motion: no-preference)',
  phone: '(max-width: 767px)',
};

// Lenis smooth scroll. lerp is the share of the remaining distance covered per frame.
// When the page moves fast (px per second between fastVelocity[0] and [1]) lerp eases down to
// lerpFast, so a hard flick glides instead of snapping.
export const SCROLL = {
  lerp: 0.1,
  lerpFast: 0.07,
  fastVelocity: [1500, 6000],
  wheelMultiplier: 1,
  touchMultiplier: 1.1,
};

// Eased followers for scroll-linked effects (parallax, the 3D turn). Each frame the value moves
// lerp of the way to its target, never faster than maxStepPerSecond (in progress units, 0..1),
// and lerp drops to lerp * fastLerpFactor when the scroll speed (px/s) is in fastVelocity.
export const FOLLOW = {
  lerp: 0.12,
  maxStepPerSecond: 1.4,
  fastVelocity: [1200, 5000],
  fastLerpFactor: 0.35,
};

// data-reveal and data-reveal-group: fade up once, never hidden again.
export const REVEAL = {
  y: 28,
  yPhone: 16,
  duration: 0.9,
  stagger: 0.08,
  ease: 'power3.out',
  start: 'top 90%',
};

// data-kinetic: headline words rise out of a mask.
export const KINETIC = {
  duration: 1.1,
  stagger: 0.07,
  delay: 0.1,
  ease: 'expo.out',
};

// data-stagger: cards and gallery images come in one after another.
export const STAGGER = {
  y: 40,
  yPhone: 24,
  scale: 0.97,
  duration: 0.85,
  stagger: 0.07,
  ease: 'power3.out',
  start: 'top 92%',
};

// data-counter: counts up to the number written in the HTML. A plain year (1900-2100) counts
// up from yearSpan years earlier instead of from 0.
export const COUNTER = {
  duration: 1.6,
  ease: 'power2.out',
  yearSpan: 12,
  start: 'top 92%',
};

// data-parallax: the image is scaled up so it can drift inside its frame. shift is the
// largest move in % of the image height, either way (keep it under (scale - 1) / 2 * 100).
export const PARALLAX = {
  scale: 1.16,
  shift: 6,
  shiftPhone: 3,
};

// data-faq: details/summary open and close.
export const FAQ = {
  open: 0.45,
  close: 0.35,
  ease: 'power2.inOut',
};

// data-filter-list: cards move to their new places (GSAP Flip).
export const FILTER = {
  duration: 0.6,
  fade: 0.35,
  ease: 'power2.inOut',
};

// Page transition: a charcoal panel with a red edge wipes over the page on internal links and
// wipes off the next page. Reduced motion: a plain fade. failSafe: navigate anyway after this.
export const TRANSITION = {
  cover: 0.5,
  uncover: 0.6,
  ease: 'power3.inOut',
  fade: 0.25,
  failSafe: 1.2,
  storageKey: 'sm-wipe',
};

// data-product-hero: the small 3D product on solution pages.
// turn / tilt: extra radians round y / x from the top of the page to the hero leaving the screen.
// lift: how far the model rises (unit box heights). sway: idle drift in radians at swaySpeed (Hz).
// entryTurn: the model starts this much progress behind and eases into place.
export const PRODUCT_HERO = {
  turn: 1.1,
  tilt: 0.14,
  lift: 0.1,
  sway: 0.035,
  swaySpeed: 0.12,
  entryTurn: 0.35,
  fov: 30,
  distance: 2.75,
  fadeIn: 1.2,
  idleTimeout: 1500,
};

// Render quality. high: desktop and tablet. low: phones. Keep environment on: the metal and white casings
// read dark under the hemisphere light alone (environment: false is the fallback for very weak GPUs).
export const QUALITY = {
  high: { maxPixelRatio: 1.75, antialias: true, environment: true, textureSize: 2048, sway: true },
  low: { maxPixelRatio: 1.5, antialias: false, environment: true, textureSize: 1024, sway: false },
};

// Studio lighting, the same values as LIGHTING in src/config/theme.js (homepage).
export const LIGHTING = {
  exposure: 1.0,
  environmentIntensity: 0.85,
  key: { colour: '#FFFFFF', intensity: 2.6, position: [2, 9, 4] },
  fill: { colour: '#F2F5FF', intensity: 0.6, position: [-5, 1.5, 3] },
  rim: { colour: '#FFFFFF', intensity: 1.4, position: [-1, 3, -6] },
  hemisphere: { sky: '#FFFFFF', ground: '#C8C8C8', intensity: 1.6 },
};

// Resting angle (radians [x, y, z]) and size per product, as in src/config/products.js.
export const PRODUCTS = {
  'solar-panel': { rotation: [0.15, -0.5, 0], scale: 1 },
  'battery-sbr': { rotation: [0.12, -0.6, 0], scale: 0.95 },
  'battery-powerstack': { rotation: [0.12, -0.6, 0], scale: 1 },
  inverter: { rotation: [0.1, -0.5, 0], scale: 0.9 },
  'hot-water': { rotation: [0.12, -0.5, 0], scale: 1 },
  'ev-charger': { rotation: [0.05, -0.4, 0], scale: 0.95 },
};
