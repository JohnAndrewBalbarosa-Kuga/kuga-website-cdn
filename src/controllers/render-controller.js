/**
 * Render controller
 * Owns the WebGL renderer, camera, resize handling and the animation loop.
 * Picks a quality tier (high / medium / low) from the device and reduced-motion setting.
 * Colour pipeline for the solid models: ACES filmic tone mapping, sRGB output, soft shadows
 * on tiers that allow them (the particle shader is not tone mapped).
 *
 * Public methods:
 *   getQuality()     -> { tier, reducedMotion, particleCount, maxPixelRatio, pointSize, shadows, shadowMapSize, environment }
 *   getRenderer()    -> THREE.WebGLRenderer or null (no WebGL)
 *   getScene()       -> THREE.Scene to add objects to
 *   getCamera()      -> THREE.PerspectiveCamera (moved by camera-controller.js)
 *   getViewSize()    -> { width, height } visible world size at z = 0, plus pixel size and ratio
 *   requestRender()  draw on the next frame (needed in reduced-motion mode, which only draws on demand)
 *   start() / stop() run or pause the loop (also paused automatically when the tab is hidden)
 *
 * Emits: 'frame' { time, delta }, 'resize' viewSize
 */

import * as THREE from 'three';
import { CAMERA, LIGHTING, QUALITY_TIERS } from '../config/theme.js';

export function createRenderController({ root, events }) {
  const host = root.querySelector('[data-kef-canvas]') || root;
  const quality = detectQuality(root);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(CAMERA.fov, 1, 0.1, 100);
  camera.position.z = CAMERA.distance;

  const renderer = createRenderer();
  let viewSize = measureView();
  let frameId = null;
  let lastTime = 0;
  let needsRender = true;
  let shouldRun = false;

  if (renderer) {
    host.appendChild(renderer.domElement);
  } else {
    root.classList.add('kef--no-webgl');
  }

  handleResize();
  window.addEventListener('resize', handleResize);
  document.addEventListener('visibilitychange', handleVisibilityChange);

  function createRenderer() {
    try {
      const antialias = quality.tier !== 'low';
      const webgl = new THREE.WebGLRenderer({ antialias, alpha: true, powerPreference: 'high-performance' });
      webgl.setClearColor(0x000000, 0);
      webgl.outputColorSpace = THREE.SRGBColorSpace;
      webgl.toneMapping = THREE.ACESFilmicToneMapping;
      webgl.toneMappingExposure = LIGHTING.toneMappingExposure;
      webgl.shadowMap.enabled = quality.shadows;
      webgl.shadowMap.type = THREE.PCFSoftShadowMap;
      return webgl;
    } catch (error) {
      console.warn('[kuga-energy-field] WebGL is not available; showing the page without particles.', error);
      return null;
    }
  }

  function measureView() {
    const pixelWidth = window.innerWidth;
    const pixelHeight = window.innerHeight;
    const height = 2 * CAMERA.distance * Math.tan(THREE.MathUtils.degToRad(CAMERA.fov / 2));
    const pixelRatio = Math.min(window.devicePixelRatio || 1, quality.maxPixelRatio);
    return { width: height * (pixelWidth / pixelHeight), height, pixelWidth, pixelHeight, pixelRatio };
  }

  function handleResize() {
    viewSize = measureView();
    camera.aspect = viewSize.pixelWidth / viewSize.pixelHeight;
    camera.updateProjectionMatrix();
    if (renderer) {
      renderer.setPixelRatio(viewSize.pixelRatio);
      renderer.setSize(viewSize.pixelWidth, viewSize.pixelHeight);
    }
    events.emit('resize', viewSize);
    requestRender();
  }

  function handleVisibilityChange() {
    if (document.hidden) {
      pauseLoop();
      return;
    }
    if (shouldRun) resumeLoop();
  }

  function renderFrame(now) {
    frameId = requestAnimationFrame(renderFrame);
    const time = now / 1000;
    const delta = Math.min(time - lastTime, 0.1);
    lastTime = time;

    events.emit('frame', { time, delta });

    if (!renderer) return;
    if (quality.reducedMotion && !needsRender) return;
    renderer.render(scene, camera);
    needsRender = false;
  }

  function resumeLoop() {
    if (frameId !== null) return;
    lastTime = performance.now() / 1000;
    frameId = requestAnimationFrame(renderFrame);
  }

  function pauseLoop() {
    if (frameId === null) return;
    cancelAnimationFrame(frameId);
    frameId = null;
  }

  function start() {
    shouldRun = true;
    if (!document.hidden) resumeLoop();
  }

  function stop() {
    shouldRun = false;
    pauseLoop();
  }

  function requestRender() {
    needsRender = true;
  }

  return {
    getQuality: () => quality,
    getRenderer: () => renderer,
    getScene: () => scene,
    getCamera: () => camera,
    getViewSize: () => viewSize,
    requestRender,
    start,
    stop,
  };
}

function detectQuality(root) {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const tier = pickQualityTier(root, reducedMotion);
  return { tier, reducedMotion, ...QUALITY_TIERS[tier] };
}

function pickQualityTier(root, reducedMotion) {
  const forcedTier = root.dataset.quality;
  if (forcedTier && QUALITY_TIERS[forcedTier]) return forcedTier;
  if (reducedMotion) return 'medium'; // draws only on change, so it can afford lighting and shadows

  const cores = navigator.hardwareConcurrency || 4;
  const memory = navigator.deviceMemory || 4;
  const isTouch = window.matchMedia('(pointer: coarse)').matches;
  const isSmallScreen = window.innerWidth < 768;

  if (cores <= 2 || memory <= 2) return 'low';
  if (isTouch || isSmallScreen || cores <= 4) return 'medium';
  return 'high';
}
