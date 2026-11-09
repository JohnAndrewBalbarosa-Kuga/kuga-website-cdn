// Visual settings for the energy field. Change colours, budgets, lighting and phase timings here only.
// Palette taken from the live site (13kuga.com.au): white and light grey pages, Kuga red, charcoal text.

export const COLOURS = {
  red: '#DC0000',
  redHover: '#EE0000',
  redDark: '#CC0000',
  white: '#FFFFFF',
  lightGrey: '#F5F5F5',
  charcoal: '#313131',
};

// Share of particles drawn red; the rest are charcoal.
export const RED_SHARE = 0.7;

// Quality tiers. The render controller picks one per device.
// shadows: soft key-light shadow on the solid model. environment: RoomEnvironment reflections.
// textureSize: width in pixels of the big canvas textures on the stand-ins (the solar cells).
export const QUALITY_TIERS = {
  high: { particleCount: 16000, maxPixelRatio: 2, pointSize: 26, shadows: true, shadowMapSize: 2048, environment: true, textureSize: 2048 },
  medium: { particleCount: 9000, maxPixelRatio: 1.5, pointSize: 30, shadows: true, shadowMapSize: 1024, environment: true, textureSize: 2048 },
  low: { particleCount: 4000, maxPixelRatio: 1, pointSize: 34, shadows: false, shadowMapSize: 0, environment: false, textureSize: 1024 },
};

export const CAMERA = {
  fov: 35,
  distance: 8,
};

// Morph timing for the non-product scenes (hero, flow, quote). MORPH_SPREAD staggers particles.
// Product scenes do not use the timer: their morph follows scroll (PRODUCT_PHASES.converge).
// maxRate: fastest the scroll-driven morph (product scenes) may move, in full morphs per second,
// so particles never jump between shapes however fast the scroll.
export const MORPH = {
  duration: 1.8,
  spread: 0.6,
  maxRate: 1.6,
};

// The KUGA word breaking into energy (hero, data-scatter). range: share of the shot over which it
// breaks apart. swirl: radians the particles wheel round the vertical axis of the word's centre by the end (slower ones
// less). spread: how far they scatter outwards (kept small so the energy swirls round the word and
// stays clear of the headline). turbulence: extra drift added as it breaks.
export const HERO_BREAK = {
  range: [0.22, 0.5],
  swirl: 2.4,
  spread: 0.28,
  turbulence: 0.9,
};

// Mouse push.
export const REPEL = {
  radius: 0.9,
  strength: 0.6,
};

// How much each scene turns the product as you scroll through it (radians). Kept gentle so the
// solid model reads like a product shot.
export const SCROLL_TURN = Math.PI * 0.45;

// Product scene phases, as [start, end] of the scene's scroll progress p (0..1).
//   converge  particles fly onto the product surface
//   solidify  the solid model dissolves in, particles fade out
//   hold      solid model on show, spec callouts visible
//   shatter   model breaks into fragments, particles re-emerge and fly on
// Keep them in order and touching (each end = the next start).
export const PRODUCT_PHASES = {
  converge: [0, 0.25],
  solidify: [0.25, 0.35],
  hold: [0.35, 0.8],
  shatter: [0.8, 1],
};

// Spec callouts: share of the hold phase in which they are shown. They clear before the shatter.
export const CALLOUTS = {
  window: [0.06, 0.9],
};

// Studio product-shot lighting for the solid models (world units; the camera sits at z = 8).
export const LIGHTING = {
  toneMappingExposure: 1.0,
  environmentIntensity: 0.85,
  key: { colour: '#FFFFFF', intensity: 2.6, position: [2, 9, 4] }, // high, so the contact shadow sits under the model
  fill: { colour: '#F2F5FF', intensity: 0.6, position: [-5, 1.5, 3] },
  rim: { colour: '#FFFFFF', intensity: 1.4, position: [-1, 3, -6] },
  // Only used when the quality tier has no environment map.
  hemisphere: { sky: '#FFFFFF', ground: '#C8C8C8', intensity: 1.6 },
  shadowCameraSize: 6,
  groundShadowOpacity: 0, // contact shadow under the model; 0 = off (it clipped oddly on wide models)
};

// Dissolve-in of the solid model (solidify phase).
export const DISSOLVE = {
  edgeColour: COLOURS.red,
  edgeWidth: 0.04, // share of the noise range that glows on the dissolve front
  edgeIntensity: 2.2, // emissive strength of the glowing edge (high values turn pink under ACES)
  noiseScale: 7, // higher = finer dissolve pattern
  heightBias: 0.35, // 0 = pure noise, 1 = strictly bottom to top
};

// Hold phase: extra turn of the solid model. It eases back to 0 at the end of hold,
// so the fragments start exactly where the solid was.
// spinRange: share of the hold phase in which a product with holdSpin (config/products.js) makes
// its whole turns. Whole turns end where they started, so the shatter still lines up.
export const SOLID = {
  holdTurn: 0.3,
  spinRange: [0.42, 0.94],
};

// Stacked products (meshes tagged with userData.stackLayer, e.g. the SBR battery): during the
// solidify phase each layer drops in from above and lands on the one below, bottom layer first.
// dropHeight: how far above its place a layer starts (model units, the model is 1 tall at most).
// landShare: share of the solidify phase each layer takes to land; the starts are spread evenly.
export const STACK_LANDING = {
  dropHeight: 0.22,
  landShare: 0.4,
};

// Sun glint: a band of light that sweeps across solar glass during the hold phase, driven by scroll
// (utils/glint-material.js). holdRange: share of the hold phase the sweep takes. direction: sweep
// axis in model space (x, y). reach: the band travels from -reach to +reach along that axis.
export const GLINT = {
  colour: '#FFFFFF',
  strength: 1.6, // brightness of the sharp core
  width: 0.022, // width of the sharp core, model units
  haloWidth: 5, // the soft halo is this many times wider than the core
  haloShare: 0.14, // halo brightness as a share of the core
  holdRange: [0.04, 0.42],
  direction: [0.8, 0.6],
  reach: 0.75,
};

// Shatter phase. Sizes are in model units (every model fits a 1-unit box).
export const SHATTER = {
  maxEdge: 0.09, // big triangles are split until no edge is longer than this
  maxTriangles: 60000, // splitting stops once the model has this many triangles
  chunkAbove: 20000, // more triangles than this: neighbouring triangles are grouped into chunks
  targetChunks: 3000,
  distance: 0.55, // how far fragments fly
  spin: 7, // radians of tumble over the shatter
  stagger: 0.35, // share of the phase used to stagger fragment start times
  particleReturn: 0.5, // share of the shatter phase over which particles fade back in
};
