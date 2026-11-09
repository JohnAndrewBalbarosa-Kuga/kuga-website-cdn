/**
 * Stage controller
 * Owns the "stage": one THREE.Group that puts the current shape in place on screen
 * (position, size, resting angle and the scroll turn). The particles, the solid model and the
 * shatter fragments are all children of the stage, so they always line up with each other.
 *
 * Public methods:
 *   getStage()   -> THREE.Group to add scene content to
 *
 * Listens: 'scene:change', 'scene:progress', 'resize', 'frame', 'scroll:jump' (snaps into place under the veil)
 */

import * as THREE from 'three';
import { getSceneLayout } from '../utils/scene-layout.js';

export function createStageController({ events, render, reducedMotion }) {
  const stage = new THREE.Group();
  render.getScene().add(stage);

  const layout = { x: 0, y: 0, size: 1, rotationX: 0, rotationY: 0, rotationZ: 0 };
  let targetLayout = { ...layout };
  let hasPlacedOnce = false;
  let activeScene = null;
  let sceneProgress = 0;
  let viewSize = render.getViewSize();

  events.on('scene:change', handleSceneChange);
  events.on('scene:progress', handleSceneProgress);
  events.on('resize', handleResize);
  events.on('frame', updateFrame);
  events.on('scroll:jump', () => {
    hasPlacedOnce = false;
  });

  function handleSceneChange(scene) {
    activeScene = scene;
    sceneProgress = 0;
    refreshTargetLayout();
  }

  function handleSceneProgress({ scene, progress }) {
    if (scene !== activeScene) return;
    sceneProgress = progress;
    refreshTargetLayout();
    render.requestRender();
  }

  function handleResize(nextViewSize) {
    viewSize = nextViewSize;
    refreshTargetLayout();
  }

  function refreshTargetLayout() {
    if (!activeScene) return;
    targetLayout = getSceneLayout({ scene: activeScene, progress: sceneProgress, viewSize, reducedMotion });
  }

  function updateFrame({ delta }) {
    if (activeScene && activeScene.shape === 'gather') refreshTargetLayout();
    moveLayoutTowardTarget(delta);
    applyLayout();
  }

  function moveLayoutTowardTarget(delta) {
    const shouldSnap = reducedMotion || !hasPlacedOnce;
    const ease = shouldSnap ? 1 : 1 - Math.pow(0.02, delta);
    Object.keys(layout).forEach((key) => {
      layout[key] += (targetLayout[key] - layout[key]) * ease;
    });
    if (activeScene) hasPlacedOnce = true;
  }

  function applyLayout() {
    stage.position.set(layout.x, layout.y, 0);
    stage.scale.setScalar(layout.size);
    stage.rotation.set(layout.rotationX, layout.rotationY, layout.rotationZ);
  }

  return { getStage: () => stage };
}
