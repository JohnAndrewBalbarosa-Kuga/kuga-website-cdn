// GSAP building blocks for one shot (one [data-scene] section), used by the director controller.
// Each function adds tweens to a chapter timeline at a position in that timeline's units (vh of scroll).
//
// Markup they read (all inside the section):
//   [data-copy]               the copy block; exits move this block, entrances move its children
//   [data-kinetic="words"]    headline split into words that rise in one after another
//   [data-kinetic="letters"]  split into letters (short words such as the wordmark)
//   [data-reveal]             fades up in DOM order with the kinetic text
//   [data-reveal="slide"]     slides in from the right instead (news cards)
//   [data-counter]            a number that counts up from 0 (text that is not a number is left alone)
//
// Entrances target the children and exits target [data-copy], so no two tweens fight over one element.

import { gsap } from 'gsap';
import { SplitText } from 'gsap/SplitText';
import { COUNTER } from '../config/story-timing.js';

const ITEM_SELECTOR = '[data-kinetic], [data-reveal]';

// Splits every [data-kinetic] element inside root. Returns the SplitText instances (call revert() to undo).
export function splitKineticText(root) {
  return Array.from(root.querySelectorAll('[data-kinetic]')).map((element) => {
    const byLetter = element.dataset.kinetic === 'letters';
    return SplitText.create(element, {
      type: byLetter ? 'words,chars' : 'words',
      mask: byLetter ? 'chars' : 'words',
      wordsClass: 'word', // SplitText names the masks word-mask and char-mask
      charsClass: 'char',
    });
  });
}

// The parts of a split element that move: letters for "letters", words otherwise.
function getMovingParts(element) {
  const selector = element.dataset.kinetic === 'letters' ? '.char' : '.word';
  const parts = element.querySelectorAll(selector);
  return parts.length ? Array.from(parts) : [element];
}

// Copy comes in: kinetic text rises piece by piece, other items fade up, counters count.
// Returns nothing; everything is added to timeline between at and at + length.
export function addEntrance(timeline, shot, at, length) {
  const items = Array.from(shot.copy.querySelectorAll(ITEM_SELECTOR));
  if (items.length === 0) return;
  const step = items.length > 1 ? (length * 0.45) / (items.length - 1) : 0;
  const itemLength = length * 0.55;

  items.forEach((item, index) => {
    const position = at + step * index;
    if (item.dataset.kinetic) {
      addKineticIn(timeline, item, position, itemLength);
    } else if (item.dataset.reveal === 'slide') {
      timeline.fromTo(item, { autoAlpha: 0, x: 56 }, { autoAlpha: 1, x: 0, duration: itemLength, ease: 'kef-cinema' }, position);
    } else {
      timeline.fromTo(item, { autoAlpha: 0, y: 40 }, { autoAlpha: 1, y: 0, duration: itemLength, ease: 'kef-cinema' }, position);
    }
  });
  addCounters(timeline, shot.copy, at + length * COUNTER.startShare, length);
}

function addKineticIn(timeline, element, position, length) {
  const parts = getMovingParts(element);
  const byLetter = element.dataset.kinetic === 'letters';
  timeline.fromTo(
    parts,
    { yPercent: 115, rotate: byLetter ? 0 : 4, autoAlpha: byLetter ? 0 : 1 },
    {
      yPercent: 0,
      rotate: 0,
      autoAlpha: 1,
      duration: length * 0.6,
      ease: 'kef-cinema',
      stagger: { amount: length * 0.4 },
    },
    position,
  );
}

// Copy leaves: the whole block lifts and fades.
export function addExit(timeline, shot, at, length) {
  timeline.to(shot.copy, { autoAlpha: 0, y: -60, duration: length, ease: 'kef-lift' }, at);
}

// Slow push on the kinetic headlines while the shot holds (a camera move on the type).
export function addHoldPush(timeline, shot, from, to, scale) {
  if (to <= from) return;
  shot.copy.querySelectorAll('[data-kinetic]').forEach((element) => {
    const centred = getComputedStyle(element).textAlign === 'center';
    gsap.set(element, { transformOrigin: centred ? '50% 50%' : '0% 50%' });
    timeline.fromTo(element, { scale: 1 }, { scale, duration: to - from, ease: 'none', immediateRender: false }, from);
  });
}

// [data-counter]: counts from 0 to the number written in the HTML, keeping its decimals.
function addCounters(timeline, copy, at, length) {
  copy.querySelectorAll('[data-counter]').forEach((element) => {
    const written = element.dataset.counterValue || element.textContent.trim();
    element.dataset.counterValue = written;
    const target = parseFloat(written);
    if (!Number.isFinite(target) || !/^[\d.,]+$/.test(written)) return; // e.g. "[XX]": just revealed
    const decimals = (written.split('.')[1] || '').length;
    const counter = { value: 0 };
    const show = () => {
      element.textContent = counter.value.toFixed(decimals);
    };
    timeline.fromTo(counter, { value: 0 }, { value: target, duration: length * 0.6, ease: 'power2.out', onUpdate: show }, at);
    show();
  });
}

// Puts counters back to the text written in the HTML (used when the story is rebuilt).
export function restoreCounters(root) {
  root.querySelectorAll('[data-counter][data-counter-value]').forEach((element) => {
    element.textContent = element.dataset.counterValue;
  });
}

// Flash frame (dip through black) at a montage cut: ramps up over inLength before the cut (never a
// hard switch), peaks on the cut, clears over outLength after it.
export function addFlash(timeline, flash, at, inLength, outLength, opacity) {
  timeline.fromTo(flash, { autoAlpha: 0 }, { autoAlpha: opacity, duration: inLength, ease: 'power2.in', immediateRender: false }, at - inLength);
  timeline.fromTo(flash, { autoAlpha: opacity }, { autoAlpha: 0, duration: outLength, ease: 'power2.out', immediateRender: false }, at);
}

// The first shot of the page plays in on load (time based), so the page never opens empty.
export function playIntro(shot, { delay, duration, stagger }) {
  const items = Array.from(shot.copy.querySelectorAll(ITEM_SELECTOR));
  const intro = gsap.timeline({ delay });
  items.forEach((item, index) => {
    const parts = item.dataset.kinetic ? getMovingParts(item) : [item];
    intro.fromTo(
      parts,
      { yPercent: item.dataset.kinetic ? 115 : 0, autoAlpha: item.dataset.kinetic ? 1 : 0 },
      { yPercent: 0, autoAlpha: 1, duration, ease: 'kef-cinema', stagger },
      index * stagger * 3,
    );
  });
  return intro;
}

// Reduced motion: each shot's copy simply fades in when it scrolls into view.
export function addStillFade(shot) {
  const items = shot.copy.querySelectorAll(ITEM_SELECTOR);
  if (items.length === 0) return;
  gsap.from(items, {
    autoAlpha: 0,
    duration: 0.6,
    stagger: 0.08,
    scrollTrigger: { trigger: shot.element, start: 'top 75%', toggleActions: 'play none none reverse' },
  });
}
