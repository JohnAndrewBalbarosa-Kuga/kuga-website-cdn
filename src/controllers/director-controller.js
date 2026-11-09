/**
 * Director controller
 * Turns the scroll story into a cut film. Sections ([data-scene]) are shots; consecutive sections
 * with the same data-chapter are a chapter. Per chapter it builds ONE paused GSAP timeline that runs
 * the text choreography, the hold pushes, the flash cuts and (first chapter) the dark cold open and
 * sunrise. It also owns the chapter wipes, the letterbox bars and the chapter counter.
 *
 * Shots are pinned: while the director runs, each section's first child (the shot) is a fixed,
 * full-screen layer and the section itself is only scroll length. Nothing is scrubbed by the raw
 * scroll: the chapter timelines and wipes are paused and set from the smoothed story position of
 * the scroll smoother every frame, so fast scrolling eases through them. A shot's layer cross-fades
 * in when the story controller makes its scene active (SHOT_FADE), so the copy and the 3D change
 * together and nothing toggles hard. After a skip dissolve everything is set at once under the veil.
 *
 * Timings and eases: config/story-timing.js. Camera moves: config/camera-moves.js (camera-controller.js).
 * Responsive and reduced motion through gsap.matchMedia(): reduced motion = no pins, wipes or bars,
 * the copy just fades in.
 *
 * Markup it reads:
 *   [data-chapter="generate"]   on each section: the chapter it belongs to (key in CHAPTERS)
 *   [data-copy]                 the copy block of a shot (see utils/shot-animations.js for the rest)
 *   [data-chapter-counter]      the counter; inside it [data-counter-number], [data-counter-total],
 *                               [data-counter-progress] and one [data-chapter-name="<id>"] per chapter
 *
 * Public methods:
 *   start()     build the story (call before the scroll smoother starts)
 *   refresh()   re-measure all triggers (after models or fonts load)
 *
 * Talks to other controllers only through the event bus (and reads the smoother's position).
 * Listens: 'scroll:position', 'scroll:jump', 'scene:change'
 * Emits: 'chapter:change' { chapter }, 'chapter:progress' { chapter, progress }
 */

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { CustomEase } from 'gsap/CustomEase';
import { EASES, FLASH, INTRO, LETTERBOX, SHOT_FADE, SUNRISE } from '../config/story-timing.js';
import {
  addEntrance,
  addExit,
  addFlash,
  addHoldPush,
  addStillFade,
  playIntro,
  restoreCounters,
  splitKineticText,
} from '../utils/shot-animations.js';
import { createStoryHud } from '../utils/story-hud.js';
import { getShotSettings, getWipeWindow, readShotPlan } from '../utils/shot-plan.js';
import { clamp01 } from '../utils/maths.js';

const FIRST_SHOT_START = 'top top'; // reduced motion: the first scene starts here
const SHOT_LINE = 'center'; // and every other scene when its top crosses the middle of the screen

export function createDirectorController({ root, events, smoother }) {
  const shots = readShotPlan(root).map(readShot);
  const chapters = groupIntoChapters(shots);
  const counter = readCounter(root);
  let activeChapter = null;
  let film = null; // { hud, wipes } while the full-motion film is built
  let visibleShot = null;

  function start() {
    gsap.registerPlugin(ScrollTrigger, SplitText, CustomEase);
    Object.entries(EASES).forEach(([name, path]) => CustomEase.create(name, path));
    events.on('scroll:position', ({ position }) => {
      if (film) applyPosition(position, false);
    });
    events.on('scroll:jump', ({ position }) => {
      if (!film) return;
      applyPosition(position, true);
      showShot(getShotAt(position), true);
    });
    events.on('scene:change', (scene) => {
      if (film) showShot(shots.find((shot) => shot.element === scene.element), false);
    });
    const media = gsap.matchMedia();
    media.add(
      {
        motion: '(prefers-reduced-motion: no-preference)',
        phone: '(max-width: 767px)',
      },
      (context) => (context.conditions.motion ? buildFilm(context.conditions) : buildStill()),
    );
  }

  // --- Full motion ----------------------------------------------------------------

  function buildFilm({ phone }) {
    root.classList.add('kef--directed');
    shots.forEach((shot) => shot.element.style.setProperty('--kef-shot-length', `${shot.settings.shotLength}vh`));
    const hud = createStoryHud(root);
    const splits = splitKineticText(root);

    chapters.forEach((chapter) => buildChapterTimeline(chapter, hud));
    const wipes = chapters
      .filter((chapter) => chapter.index > 0 && chapter.settings.transition === 'wipe')
      .map((chapter) => buildWipe(chapter, hud.addWipe(), phone));
    film = { hud, wipes };

    visibleShot = null;
    shots.forEach((shot) => gsap.set(shot.layer, { autoAlpha: 0 }));
    playIntro(shots[0], INTRO);
    activeChapter = null;
    ScrollTrigger.refresh();
    const position = smoother.getPosition();
    applyPosition(position, true);
    showShot(getShotAt(position), true);

    return () => {
      film = null;
      splits.forEach((split) => split.revert());
      restoreCounters(root);
      hud.destroy();
      root.classList.remove('kef--directed', 'kef--letterbox');
      shots.forEach((shot) => shot.element.style.removeProperty('--kef-shot-length'));
    };
  }

  // One paused timeline per chapter, in vh of scroll from the chapter start. applyPosition() sets its time.
  function buildChapterTimeline(chapter, hud) {
    const timeline = gsap.timeline({ paused: true, defaults: { ease: 'none' } });
    let position = 0;
    chapter.shots.forEach((shot, index) => {
      shot.offset = position;
      addShotChoreography(timeline, shot, position, shot.span);
      if (index > 0 && chapter.settings.cuts === 'flash') {
        const inLength = FLASH.inLength * chapter.shots[index - 1].span;
        addFlash(timeline, hud.flash, position, inLength, FLASH.length * shot.span, FLASH.opacity);
      }
      if (shot.isPageStart && chapter.settings.transition === 'sunrise') addSunrise(timeline, hud.grade, position, shot.span);
      position += shot.span;
    });
    timeline.set({}, {}, position); // the timeline is exactly as long as the chapter's scroll
    chapter.timeline = timeline;
    chapter.duration = position;
    chapter.lastTime = null;
  }

  // One shot inside its chapter timeline. Positions are vh of scroll from the chapter start.
  function addShotChoreography(timeline, shot, start, span) {
    const { enterAt, enterLength, exitLength, holdScale } = shot.settings;
    const exitAt = shot.settings.exitAt ?? 1 - exitLength;
    const enterEnd = shot.isPageStart ? 0 : enterAt + enterLength;
    if (!shot.isPageStart && enterLength > 0) addEntrance(timeline, shot, start + enterAt * span, enterLength * span);
    if (exitLength > 0 && !shot.isPageEnd) addExit(timeline, shot, start + exitAt * span, exitLength * span);
    addHoldPush(timeline, shot, start + enterEnd * span, start + exitAt * span, holdScale);
  }

  // Dark cold open, then the light comes up: dark layer fades, a warm glow rises, a light band sweeps.
  function addSunrise(timeline, grade, start, span) {
    const [lightFrom, lightTo] = SUNRISE.lightUp;
    const [glowFrom, glowTo] = SUNRISE.glowRise;
    const glowLength = (glowTo - glowFrom) * span;
    timeline.fromTo(grade.dark, { autoAlpha: SUNRISE.darkOpacity }, { autoAlpha: 0, duration: (lightTo - lightFrom) * span, ease: 'power1.in' }, start + lightFrom * span);
    timeline.fromTo(grade.sun, { yPercent: 55, scale: 0.4, autoAlpha: 0 }, { yPercent: -5, scale: 1.6, autoAlpha: 1, duration: glowLength * 0.6, ease: 'power2.out' }, start + glowFrom * span);
    timeline.to(grade.sun, { autoAlpha: 0, duration: glowLength * 0.4, ease: 'power1.in' }, start + glowFrom * span + glowLength * 0.6);
    timeline.fromTo(grade.sweep, { xPercent: -120 }, { xPercent: 120, duration: (lightTo - lightFrom) * span, ease: 'kef-wipe' }, start + lightFrom * span);
  }

  // A charcoal panel crosses the screen around the chapter's first cut: covers, cut, uncovers.
  // Paused; its time (0..2) follows the story position through the wipe window.
  function buildWipe(chapter, panel, phone) {
    const axis = phone ? 'yPercent' : 'xPercent';
    const direction = phone ? -1 : 1; // phone: bottom to top; wider: left to right
    const timeline = gsap
      .timeline({ paused: true })
      .fromTo(panel, { [axis]: -101 * direction }, { [axis]: 0, duration: 1, ease: 'kef-wipe' })
      .to(panel, { [axis]: 101 * direction, duration: 1, ease: 'kef-wipe' });
    return { timeline, window: getWipeWindow(shots, chapter.shots[0].index), lastTime: null };
  }

  // Sets every chapter timeline and wipe from the smoothed story position.
  function applyPosition(position, force) {
    chapters.forEach((chapter) => {
      const time = getChapterTime(chapter, position);
      if (!force && time === chapter.lastTime) return;
      chapter.lastTime = time;
      chapter.timeline.time(time);
    });
    film.wipes.forEach((wipe) => {
      const time = getWipeTime(wipe.window, position);
      if (!force && time === wipe.lastTime) return;
      wipe.lastTime = time;
      wipe.timeline.time(time);
    });
    const chapter = getShotAt(position).chapter;
    enterChapter(chapter, film.hud);
    updateChapterProgress(chapter, chapter.duration ? chapter.lastTime / chapter.duration : 0);
  }

  function getChapterTime(chapter, position) {
    const first = chapter.shots[0];
    const last = chapter.shots[chapter.shots.length - 1];
    if (position <= first.index) return 0;
    if (position >= last.index + 1) return chapter.duration;
    const shot = chapter.shots[Math.floor(position) - first.index];
    return shot.offset + (position - shot.index) * shot.span;
  }

  function getShotAt(position) {
    return shots[Math.min(shots.length - 1, Math.max(0, Math.floor(position)))];
  }

  // Cross-fade to this shot's layer (instant under the skip veil and on build).
  function showShot(shot, instant) {
    if (!shot || (shot === visibleShot && !instant)) return;
    visibleShot = shot;
    shots.forEach((each) => {
      const autoAlpha = each === shot ? 1 : 0;
      if (instant) gsap.set(each.layer, { autoAlpha, overwrite: true });
      else gsap.to(each.layer, { autoAlpha, duration: SHOT_FADE.duration, ease: 'power1.inOut', overwrite: true });
    });
  }

  // --- Reduced motion ---------------------------------------------------------------

  function buildStill() {
    root.classList.add('kef--still');
    shots.forEach(addStillFade);
    chapters.forEach((chapter) => {
      const last = chapter.shots[chapter.shots.length - 1];
      ScrollTrigger.create({
        trigger: chapter.shots[0].element,
        start: chapter.shots[0].isPageStart ? FIRST_SHOT_START : `top ${SHOT_LINE}`,
        endTrigger: last.element,
        end: `bottom ${SHOT_LINE}`,
        onToggle: (trigger) => {
          if (trigger.isActive) enterChapter(chapter, null);
        },
        onUpdate: (trigger) => updateChapterProgress(chapter, trigger.progress),
      });
    });
    activeChapter = null;
    enterChapter(chapters[0], null);
    ScrollTrigger.refresh();
    return () => root.classList.remove('kef--still');
  }

  // --- Chapters: counter, letterbox, events -----------------------------------------------

  function enterChapter(chapter, hud) {
    if (!chapter || chapter === activeChapter) return;
    activeChapter = chapter;
    events.emit('chapter:change', { chapter });
    showChapterInCounter(chapter);
    if (hud) setLetterbox(hud.bars, chapter.settings.letterbox);
  }

  function updateChapterProgress(chapter, progress) {
    if (chapter !== activeChapter) return;
    if (counter.progress) gsap.set(counter.progress, { scaleX: progress });
    events.emit('chapter:progress', { chapter, progress });
  }

  function setLetterbox(bars, on) {
    root.classList.toggle('kef--letterbox', Boolean(on));
    gsap.to(bars, { scaleY: on ? 1 : 0, duration: LETTERBOX.duration, ease: 'power3.inOut', overwrite: 'auto' });
  }

  function showChapterInCounter(chapter) {
    if (!counter.element) return;
    if (counter.number) {
      counter.number.textContent = String(chapter.index + 1).padStart(2, '0');
      gsap.fromTo(counter.number, { yPercent: 100 }, { yPercent: 0, duration: 0.5, ease: 'power3.out', overwrite: true });
    }
    if (counter.total) counter.total.textContent = `/ ${String(chapters.length).padStart(2, '0')}`;
    counter.names.forEach((name) => {
      const current = name.dataset.chapterName === chapter.id;
      gsap.to(name, { autoAlpha: current ? 1 : 0, yPercent: current ? 0 : -60, duration: 0.45, ease: 'power3.out', overwrite: true });
    });
  }

  return {
    start,
    refresh: () => ScrollTrigger.refresh(),
  };
}

// --- Reading the page ---------------------------------------------------------------------

// A shot from the plan (utils/shot-plan.js) plus the elements the director moves.
function readShot(planShot) {
  const section = planShot.element;
  const layer = section.firstElementChild || section;
  return {
    ...planShot,
    layer,
    copy: section.querySelector('[data-copy]') || layer,
    chapter: null, // set by groupIntoChapters
  };
}

function groupIntoChapters(shots) {
  const chapters = [];
  shots.forEach((shot) => {
    const previous = chapters[chapters.length - 1];
    if (previous && previous.id === shot.chapterId) {
      previous.shots.push(shot);
      shot.chapter = previous;
      return;
    }
    const chapter = {
      id: shot.chapterId,
      index: chapters.length,
      shots: [shot],
      settings: getShotSettings(null, shot.chapterId),
    };
    shot.chapter = chapter;
    chapters.push(chapter);
  });
  return chapters;
}

// Time (0..2) of a wipe: 0..1 covering up to the cut, 1..2 uncovering after it.
function getWipeTime({ from, cut, to }, position) {
  if (position <= cut) return clamp01((position - from) / (cut - from));
  return 1 + clamp01((position - cut) / (to - cut));
}

function readCounter(root) {
  const element = root.querySelector('[data-chapter-counter]');
  if (!element) return { element: null, names: [] };
  return {
    element,
    number: element.querySelector('[data-counter-number]'),
    total: element.querySelector('[data-counter-total]'),
    progress: element.querySelector('[data-counter-progress]'),
    names: Array.from(element.querySelectorAll('[data-chapter-name]')),
  };
}
