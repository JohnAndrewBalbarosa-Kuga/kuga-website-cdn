// [data-product-hero="<product id>"]: a small 3D model of the page's product in the hero, built
// from the homepage's procedural meshes and lit like the homepage. Loaded lazily after the first
// paint (main.js), only on pages that have the attribute. It turns gently as the page scrolls,
// through an eased, velocity-aware follower, plus a slow idle sway on the high tier.
// Phones get the low tier. Reduced motion: one still frame. If WebGL or the build fails, the
// container is hidden and the hero falls back to one column; the copy is untouched.

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { PRODUCT_HERO, PRODUCTS, QUALITY } from './config.js';
import { createFollower } from './follower.js';
import { getScrollSpeed } from './scroll-speed.js';
import { buildProduct, isKnownProduct } from './product-models.js';
import { createProductScene } from './product-scene.js';

export function startProductHeroes(mode) {
  document.querySelectorAll('[data-product-hero]').forEach((container) => {
    startOne(container, mode).catch((error) => giveUp(container, error));
  });
}

async function startOne(container, mode) {
  const id = container.dataset.productHero;
  if (!isKnownProduct(id)) throw new Error(`unknown product "${id}"`);
  if (!supportsWebGL()) throw new Error('WebGL is not available');

  const quality = mode.phone ? QUALITY.low : QUALITY.high;
  const settings = PRODUCTS[id];
  const canvas = document.createElement('canvas');
  canvas.className = 'sm-product__canvas';
  canvas.addEventListener('webglcontextlost', () => giveUp(container, new Error('WebGL context lost')));

  const stage = createProductScene(canvas, quality);
  const glints = stage.setProduct(await buildProduct(id, quality.textureSize), settings.scale);
  container.append(canvas);

  const scroll = ScrollTrigger.create({
    start: 0,
    end: () => container.getBoundingClientRect().bottom + window.scrollY,
  });
  const follower = createFollower(mode.reduced ? scroll.progress : scroll.progress - PRODUCT_HERO.entryTurn);
  const pose = (progress, seconds) => {
    const sway = quality.sway && !mode.reduced ? Math.sin(seconds * Math.PI * 2 * PRODUCT_HERO.swaySpeed) * PRODUCT_HERO.sway : 0;
    const [x, y, z] = settings.rotation;
    stage.pivot.rotation.set(x + progress * PRODUCT_HERO.tilt, y + progress * PRODUCT_HERO.turn + sway, z);
    stage.pivot.position.y = Math.max(0, progress) * PRODUCT_HERO.lift;
    glints.forEach((glint) => { glint.value = Math.min(1, Math.max(0, progress)); });
    stage.render();
  };

  const resize = () => {
    stage.resize(container.clientWidth, container.clientHeight);
    pose(follower.value, gsap.ticker.time);
  };
  new ResizeObserver(resize).observe(container);
  resize();
  gsap.fromTo(canvas, { opacity: 0, scale: 0.94 }, { opacity: 1, scale: 1, duration: PRODUCT_HERO.fadeIn, ease: 'power3.out' });
  if (mode.reduced) return;

  const tick = (time, deltaMs) => {
    const progress = follower.update(scroll.progress, getScrollSpeed(), Math.min(deltaMs / 1000, 0.1));
    pose(progress, time);
  };
  new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) gsap.ticker.add(tick);
    else gsap.ticker.remove(tick);
  }).observe(container);
}

function supportsWebGL() {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch (error) {
    return false;
  }
}

function giveUp(container, error) {
  container.hidden = true;
  console.info(`[site-motion] 3D product hero skipped: ${error.message}`);
}
