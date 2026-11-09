// The shot plan: every [data-scene] section as a shot with its merged timing settings, plus the two
// lists worked out from it in story positions (0 at the top of the page, +1 per shot):
//   brake zones   transitions the smoothed scroll may not rush through (scroll-smoother.js)
//   rest ranges   finished frames a stop settles on (snap-controller.js)
// Shared by the director, the smoother and the snap controller so they all agree.

import { getProduct } from '../config/products.js';
import { CALLOUTS, PRODUCT_PHASES } from '../config/theme.js';
import { BRAKES, CHAPTERS, FLASH, SHOTS, SHOT_DEFAULTS, SNAP, WIPE } from '../config/story-timing.js';

export function readShotPlan(root) {
  const sections = Array.from(root.querySelectorAll('[data-scene]'));
  return sections.map((section, index) => {
    const id = section.dataset.scene || `scene-${index}`;
    const chapterId = section.dataset.chapter || 'story';
    const isPageStart = index === 0;
    const settings = getShotSettings(id, chapterId);
    const previous = sections[index - 1];
    return {
      index,
      id,
      chapterId,
      element: section,
      isPageStart,
      isPageEnd: index === sections.length - 1,
      isChapterStart: !previous || (previous.dataset.chapter || 'story') !== chapterId,
      isProduct: Boolean(getProduct(section.dataset.shape)),
      settings,
      span: getShotSpan(settings, isPageStart),
    };
  });
}

export function getShotSettings(sceneId, chapterId) {
  return { ...SHOT_DEFAULTS, ...CHAPTERS[chapterId], ...SHOTS[sceneId] };
}

// Scroll length of a shot in vh. The first scene starts at the top of the page, not mid-screen,
// so it is half a screen shorter.
export function getShotSpan(settings, isPageStart) {
  return isPageStart ? settings.shotLength - 50 : settings.shotLength;
}

// Story positions where a chapter wipe covers and uncovers the cut into shot index.
export function getWipeWindow(plan, index) {
  return {
    from: index - WIPE.halfLength / plan[index - 1].span,
    cut: index,
    to: index + WIPE.halfLength / plan[index].span,
  };
}

// [{ from, to, seconds }]: the shown position takes at least `seconds` to cross from..to.
export function getBrakeZones(plan) {
  const zones = [];
  plan.forEach((shot, index) => {
    const chapter = CHAPTERS[shot.chapterId] || {};
    if (index > 0 && shot.isChapterStart && chapter.transition === 'wipe') {
      const { from, to } = getWipeWindow(plan, index);
      zones.push({ from, to, seconds: BRAKES.wipe });
    }
    if (index > 0 && !shot.isChapterStart && chapter.cuts === 'flash') {
      zones.push({ from: index - FLASH.inLength, to: index + FLASH.length, seconds: BRAKES.flash });
    }
    if (shot.isProduct) addProductZones(zones, index);
  });
  return zones;
}

function addProductZones(zones, index) {
  const [holdStart, holdEnd] = PRODUCT_PHASES.hold;
  const calloutsOut = holdStart + (holdEnd - holdStart) * CALLOUTS.window[1];
  const add = ([from, to], seconds) => zones.push({ from: index + from, to: index + to, seconds });
  add(PRODUCT_PHASES.converge, BRAKES.converge);
  add(PRODUCT_PHASES.solidify, BRAKES.solidify);
  add([calloutsOut, holdEnd], BRAKES.calloutsOut);
  add(PRODUCT_PHASES.shatter, BRAKES.shatter);
}

// [[from, to], ...] in story positions, in page order.
export function getRestRanges(plan) {
  const ranges = [];
  plan.forEach((shot) => {
    getShotRest(shot).forEach(([from, to]) => {
      if (to > from) ranges.push([shot.index + from, shot.index + to]);
    });
  });
  return ranges;
}

// Finished frames of one shot, as shares of the shot.
function getShotRest(shot) {
  const { settings } = shot;
  if (settings.rest) return settings.rest;
  if (shot.isProduct) {
    const [holdStart, holdEnd] = PRODUCT_PHASES.hold;
    const [restFrom, restTo] = SNAP.productRest;
    return [[holdStart + (holdEnd - holdStart) * restFrom, holdStart + (holdEnd - holdStart) * restTo]];
  }
  const enterEnd = shot.isPageStart ? 0 : settings.enterAt + settings.enterLength;
  const exitAt = settings.exitAt ?? (settings.exitLength > 0 ? 1 - settings.exitLength : 1);
  return [[enterEnd + SNAP.inset, exitAt - SNAP.inset]];
}
