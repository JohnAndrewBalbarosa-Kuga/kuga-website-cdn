// Camera moves per chapter, used by controllers/camera-controller.js.
// Each chapter is a list of keyframes over the chapter's scroll progress (at: 0..1).
//   dolly   distance multiplier: below 1 pushes in, above 1 pulls back (1 = normal framing)
//   orbit   degrees round the product (positive = camera moves to the right)
//   crane   degrees of height: negative = camera rises and looks down
//   focus   0 = frame the whole shape; 1 = aim at the chapter's focus anchor (CAMERA_FOCUS below) and
//           put it on the shape's spot on screen. In between it blends. Dolly then pushes in on the anchor.
// The camera turns round the product's own spot on screen, so the product stays where the layout put it.
// Missing values mean 0 (orbit, crane) or 1 (dolly). Between keyframes the values ease (smoothstep).
// End each chapter near neutral if the next one starts neutral, or the cut will show a jump.

export const CAMERA_MOVES = {
  'cold-open': [
    { at: 0, dolly: 1.2 },
    { at: 0.35, dolly: 1.05 },
    { at: 0.5, dolly: 1 },
    { at: 0.7, dolly: 0.92 }, // slow push-in on the KUGA word
    { at: 1, dolly: 1 },
  ],
  generate: [
    { at: 0, dolly: 1.08, orbit: -12, crane: 2 },
    { at: 0.5, dolly: 0.96, orbit: 0, crane: -2 },
    { at: 1, dolly: 0.9, orbit: 10, crane: -4 },
  ],
  store: [
    { at: 0, dolly: 1.05, orbit: 10, crane: -8 },
    { at: 0.49, dolly: 0.95, orbit: -6, crane: -2 },
    { at: 0.51, dolly: 1.05, orbit: -10, crane: -6 },
    { at: 1, dolly: 0.95, orbit: 6, crane: 0 },
  ],
  // Montage: a quick push-in per shot, angle alternating, so each cut lands on a fresh angle.
  montage: [
    { at: 0, dolly: 1.12, orbit: -14 },
    { at: 0.33, dolly: 0.9, orbit: -4 },
    { at: 0.34, dolly: 1.12, orbit: 14 },
    { at: 0.66, dolly: 0.9, orbit: 4 },
    { at: 0.67, dolly: 1.12, orbit: -10, crane: -6 },
    { at: 1, dolly: 0.9, orbit: 0, crane: -2 },
  ],
  // Starts close on the house, holds there while the site assembles (converge, solidify), then pulls
  // back and rises during the hold to reveal the warehouse, its roof array, the carport and the
  // battery. Fully wide before the shatter (PRODUCT_PHASES.shatter starts at 0.8).
  together: [
    { at: 0, dolly: 0.34, focus: 1, orbit: -14, crane: -6 },
    { at: 0.4, dolly: 0.27, focus: 1, orbit: -6, crane: -6 },
    { at: 0.7, dolly: 1, focus: 0, orbit: 8, crane: -14 }, // before the end of the hold rest range (SNAP.productRest)
    { at: 1, dolly: 1.05, focus: 0, orbit: 12, crane: -14 },
  ],
  proof: [
    { at: 0, dolly: 1.05 },
    { at: 1, dolly: 0.95, orbit: 6 },
  ],
  // Recognition: a slow, calm drift through the particle field (no product), back near neutral for the end card.
  recognition: [
    { at: 0, dolly: 1.08, orbit: -4 },
    { at: 1, dolly: 1.02, orbit: 4 },
  ],
  // End card settles to neutral so the particles line up with the quote button.
  end: [
    { at: 0, dolly: 1.15 },
    { at: 0.3, dolly: 1 },
    { at: 1, dolly: 1 },
  ],
};

// Chapter -> name of the anchor that `focus` aims at. Anchors are named points the shape's builder
// puts in group.userData.anchors (shapes/commercial-site.js: 'house'). No anchor = focus does nothing.
export const CAMERA_FOCUS = {
  together: 'house',
};
