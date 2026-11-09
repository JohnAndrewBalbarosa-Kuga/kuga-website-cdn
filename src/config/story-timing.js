// Story timing for the director controller: chapter lengths, shot beats, transitions and eases.
// Retime a chapter here only. Copy stays in index.html; chapters are grouped there with data-chapter.
//
// Units:
//   shotLength   scroll length of each shot (one [data-scene] section) in vh. 100 = one screen.
//   enterAt      share of the shot (0..1) at which its copy starts to come in
//   enterLength  share of the shot the copy takes to come in
//   exitLength   share of the shot (at its end) the copy takes to leave; 0 = it stays until the cut
//   transition   how the chapter starts: 'sunrise' (first chapter only), 'wipe', 'cut'
//   cuts         how shots inside the chapter change: 'cut' (a short cross-fade, SHOT_FADE) or 'flash' (a quick dip through black)
//   letterbox    true = cinema bars on while the chapter plays

export const CHAPTERS = {
  'cold-open': {
    shotLength: 180,
    transition: 'sunrise',
    cuts: 'cut',
    letterbox: true,
  },
  generate: { shotLength: 240, transition: 'wipe', cuts: 'cut', letterbox: false },
  store: { shotLength: 220, transition: 'wipe', cuts: 'cut', letterbox: false },
  // Ad-style montage: shorter shots and a flash frame at every cut.
  montage: { shotLength: 150, transition: 'wipe', cuts: 'flash', letterbox: false, enterLength: 0.1, exitLength: 0.06 },
  together: { shotLength: 260, transition: 'wipe', cuts: 'cut', letterbox: true },
  proof: { shotLength: 200, transition: 'wipe', cuts: 'cut', letterbox: false },
  // Credits after the proof, two shots: the award badges (click one to enlarge it), then the latest news.
  // A longer entrance, since it staggers many badges, and a calm hold.
  recognition: { shotLength: 220, transition: 'wipe', cuts: 'cut', letterbox: false, enterAt: 0.05, enterLength: 0.26, exitLength: 0.1 },
  end: { shotLength: 160, transition: 'wipe', cuts: 'cut', letterbox: true, enterAt: 0.04, enterLength: 0.3, exitLength: 0 },
};

// Used for anything a chapter or shot does not set.
export const SHOT_DEFAULTS = {
  shotLength: 200,
  enterAt: 0.05,
  enterLength: 0.16,
  exitLength: 0.1,
  holdScale: 1.04, // slow push on the headline while the shot holds
};

// Per-shot overrides, keyed by data-scene. These win over the chapter values.
export const SHOTS = {
  // Cold open: the line plays in on page load (no scroll needed); scroll then lifts it and brings the sunrise.
  // rest ends before the sunrise glow starts (SUNRISE.glowRise).
  'cold-open': { shotLength: 170, enterAt: 0, enterLength: 0, exitLength: 0.2, exitAt: 0.32, rest: [[0, 0.22]] },
  // The KUGA particle word stands alone first. The headline only comes in once the word has
  // broken apart into energy (HERO_BREAK.range in theme.js), and it sits in the lower third.
  // rest: the two finished frames a stop settles on (word standing; word broken, headline up).
  hero: { shotLength: 230, enterAt: 0.52, enterLength: 0.16, exitLength: 0.1, rest: [[0.04, 0.2], [0.7, 0.88]] },
  energy: { shotLength: 170 },
  // Recognition: rest from just after the badges have all come in to just before the copy starts to leave
  // (exit at 0.9). The news shot is shorter: three cards, then on to the end card.
  recognition: { rest: [[0.33, 0.88]] },
  news: { shotLength: 170, enterLength: 0.2 },
};

// Cold open grade: near-dark at the top of the page, then a sunrise light sweep (share of the cold-open shot).
export const SUNRISE = {
  darkOpacity: 0.94,
  lightUp: [0.3, 0.9], // dark layer fades out over this range
  glowRise: [0.25, 1], // the warm glow rises and spreads over this range
};

// Chapter wipes: a charcoal panel with a red leading edge crosses the screen and hides the cut.
// halfLength is the scroll (vh) it takes to cover; the same again to uncover.
export const WIPE = {
  halfLength: 14,
};

// Flash frame (a dip through black) at montage cuts. It ramps up over inLength (share of the shot
// before the cut), peaks at opacity on the cut and clears over length (share of the new shot).
export const FLASH = {
  opacity: 0.85,
  inLength: 0.03,
  length: 0.05,
};

// Load-time intro (seconds): the cold-open line plays in without scrolling.
export const INTRO = {
  delay: 0.5,
  duration: 1.4,
  stagger: 0.09,
};

// Cinema bars: tween time in seconds when a chapter switches them on or off.
export const LETTERBOX = {
  duration: 0.9,
};

// Counters ([data-counter]) count up over the shot's entrance; this delays them a little.
export const COUNTER = {
  startShare: 0.3, // share of the entrance before counting starts
};

// --- Scroll feel (controllers/scroll-smoother.js, controllers/snap-controller.js) ---------------
// Everything that follows scroll reads one smoothed "story position": 0 at the top of the page,
// +1 per shot (2.5 = half-way through the third shot). The smoother moves the shown position toward
// the real scroll every frame. Speeds are in shots per second; scroll speed in screens per second.

// Lenis smooth scrolling. lerp: share of the gap closed per frame (lower = smoother, laggier).
// wheelMultiplier scales mouse wheel and trackpad deltas; touchMultiplier scales touch swipes.
export const LENIS = {
  lerp: 0.085,
  wheelMultiplier: 0.8,
  touchMultiplier: 1,
};

// Catch-up of the shown position. calm = slow scrolling, fast = flicking; in between they blend.
//   lerp      share of the gap closed per frame at 60 fps
//   maxRate   most the shown position may move per second (shots/s)
// slowSpeed / fastSpeed: scroll speeds (screens/s) where the blend starts and ends.
// speedDecay: share of the measured speed left after one second once scrolling slows, so the
// smoothing relaxes gently instead of snapping back the moment the wheel stops.
export const SMOOTHING = {
  calm: { lerp: 0.14, maxRate: 2.2 },
  fast: { lerp: 0.06, maxRate: 1.1 },
  slowSpeed: 1.5,
  fastSpeed: 6,
  speedDecay: 0.2,
};

// Brakes: the least time (seconds) the shown position takes to cross each transition, however fast
// the scroll. Wipes and flashes cover their cut; product phases never pop.
export const BRAKES = {
  wipe: 0.5,
  flash: 0.35,
  converge: 0.5,
  solidify: 0.45,
  calloutsOut: 0.3, // from the callouts starting to clear to the shatter starting
  shatter: 0.6,
};

// Skipping: when the real scroll gets more than gap shots ahead of the shown position within
// windowMs, the page dissolves through a veil straight to the destination instead of flashing
// every shot in between. Durations in seconds.
export const JUMP = {
  gap: 1.25,
  windowMs: 700,
  coverDuration: 0.22,
  holdDuration: 0.06,
  revealDuration: 0.5,
};

// Shot layers cross-fade (no hard cuts) over this long, in seconds.
export const SHOT_FADE = {
  duration: 0.35,
};

// Rest points: when scrolling stops for delay seconds outside a finished frame, the page eases to
// the nearest one over duration seconds. Finished frames are each product's hold (productRest,
// share of the hold phase, inside the callout window) and each text shot from its copy fully in to
// its copy starting to leave (inset trims the edges, share of the shot). SHOTS.<id>.rest overrides.
// forwardBias < 1 favours the rest point in the direction the visitor was scrolling.
export const SNAP = {
  delay: 0.4,
  duration: 0.8,
  forwardBias: 0.6,
  inset: 0.02,
  productRest: [0.14, 0.84],
};

// Camera catch-up: share of the gap left after one second. At a new scene the camera swings
// over (cutEasePerSecond for cutDuration seconds) instead of snapping.
export const CAMERA_FOLLOW = {
  easePerSecond: 0.03,
  cutEasePerSecond: 0.0008,
  cutDuration: 0.7,
};

// Custom eases (CustomEase SVG paths). Names are used in shot-animations.js.
export const EASES = {
  'kef-cinema': 'M0,0 C0.16,0.84 0.3,1 1,1', // fast attack, long settle: type landing
  'kef-wipe': 'M0,0 C0.7,0 0.3,1 1,1', // slow in, slow out: panel wipes
  'kef-lift': 'M0,0 C0.5,0 0.75,0.2 1,1', // slow start, quick finish: exits
};
