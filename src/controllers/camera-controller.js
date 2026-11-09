/**
 * Camera controller
 * Moves the 3D camera per chapter: dolly (push-in / pull-back), orbit and crane, from the keyframes
 * in config/camera-moves.js. The camera turns round the active shape's spot on screen (the pivot),
 * so the product stays where scene-layout put it while the angle changes.
 * A keyframe's focus (0..1) moves the aim from the shape's spot to a named anchor on the model
 * (CAMERA_FOCUS), e.g. the house in the together scene, keeping that point on the same spot on screen.
 * A new scene swings the camera over quickly but eased (CAMERA_FOLLOW in story-timing.js); inside a
 * scene it eases gently. It only snaps on the first frame and under the skip-dissolve veil.
 * Not created with reduced motion (the camera then stays still).
 *
 * Public methods: none.
 *
 * Listens: 'chapter:change' { chapter }, 'chapter:progress' { chapter, progress },
 *          'scene:change' scene, 'shape:ready' { scene, shape } (anchors), 'scroll:jump', 'resize' viewSize, 'frame' { delta }
 */

import * as THREE from 'three';
import { CAMERA } from '../config/theme.js';
import { CAMERA_FOCUS, CAMERA_MOVES } from '../config/camera-moves.js';
import { CAMERA_FOLLOW } from '../config/story-timing.js';
import { getSceneLayout } from '../utils/scene-layout.js';
import { smoothstep } from '../utils/maths.js';

const NEUTRAL = { dolly: 1, orbit: 0, crane: 0, focus: 0 };

export function createCameraController({ events, render }) {
  const camera = render.getCamera();
  const pivot = new THREE.Vector3();
  const targetPivot = new THREE.Vector3();
  const focusPoint = new THREE.Vector3();
  const targetFocusPoint = new THREE.Vector3();
  const aim = new THREE.Vector3();
  const layoutTurn = new THREE.Euler();
  const offset = new THREE.Vector3();
  const turn = new THREE.Quaternion();
  const euler = new THREE.Euler(0, 0, 0, 'YXZ');
  const move = { ...NEUTRAL };
  let targetMove = { ...NEUTRAL };
  let chapterId = null;
  let activeScene = null;
  let anchors = null;
  let viewSize = render.getViewSize();
  let snapNext = true;
  let cutTimeLeft = 0;

  events.on('chapter:change', ({ chapter }) => {
    chapterId = chapter.id;
    refreshPivot();
  });
  events.on('chapter:progress', ({ chapter, progress }) => {
    if (chapter.id !== chapterId) return;
    targetMove = getMoveAt(CAMERA_MOVES[chapterId], progress);
  });
  events.on('scene:change', (scene) => {
    activeScene = scene;
    anchors = null;
    refreshPivot();
    cutTimeLeft = CAMERA_FOLLOW.cutDuration;
  });
  events.on('shape:ready', ({ scene, shape }) => {
    if (scene !== activeScene) return;
    anchors = (shape.mesh && shape.mesh.userData.anchors) || null;
    refreshPivot();
  });
  events.on('scroll:jump', () => {
    snapNext = true;
  });
  events.on('resize', (nextViewSize) => {
    viewSize = nextViewSize;
    refreshPivot();
  });
  events.on('frame', updateFrame);

  function refreshPivot() {
    if (!activeScene) return;
    const layout = getSceneLayout({ scene: activeScene, progress: 0.5, viewSize, reducedMotion: false });
    targetPivot.set(layout.x, layout.y, 0);
    if (!setAnchorInWorld(targetFocusPoint, layout)) targetFocusPoint.copy(targetPivot);
  }

  // The chapter's focus anchor in world space: model space -> stage (size, resting angle, spot).
  // Uses the same layout as the stage at mid-scene, so it holds for shapes without data-rotate.
  function setAnchorInWorld(target, layout) {
    const name = CAMERA_FOCUS[chapterId];
    const anchor = name && anchors ? anchors[name] : null;
    if (!anchor) return false;
    layoutTurn.set(layout.rotationX, layout.rotationY, layout.rotationZ);
    target.copy(anchor).multiplyScalar(layout.size).applyEuler(layoutTurn);
    target.x += layout.x;
    target.y += layout.y;
    return true;
  }

  function updateFrame({ delta }) {
    const leftPerSecond = cutTimeLeft > 0 ? CAMERA_FOLLOW.cutEasePerSecond : CAMERA_FOLLOW.easePerSecond;
    cutTimeLeft = Math.max(0, cutTimeLeft - delta);
    const ease = snapNext ? 1 : 1 - Math.pow(leftPerSecond, delta);
    snapNext = false;
    pivot.lerp(targetPivot, ease);
    focusPoint.lerp(targetFocusPoint, ease);
    Object.keys(move).forEach((key) => {
      move[key] += (targetMove[key] - move[key]) * ease;
    });
    applyMove();
  }

  // Rigid turn of the camera round the aim point, then a dolly along the line to it. The aim is the
  // pivot, or (focus) the anchor; either way it lands on the pivot's spot on screen.
  function applyMove() {
    euler.set(THREE.MathUtils.degToRad(move.crane), THREE.MathUtils.degToRad(move.orbit), 0);
    turn.setFromEuler(euler);
    aim.copy(pivot).lerp(focusPoint, move.focus);
    offset.set(-pivot.x, -pivot.y, CAMERA.distance).multiplyScalar(move.dolly).applyQuaternion(turn);
    camera.position.copy(aim).add(offset);
    camera.quaternion.copy(turn);
  }
}

function getMoveAt(keyframes, progress) {
  if (!keyframes || keyframes.length === 0) return { ...NEUTRAL };
  const filled = keyframes.map((frame) => ({ ...NEUTRAL, ...frame }));
  if (progress <= filled[0].at) return pickMove(filled[0]);
  const nextIndex = filled.findIndex((frame) => frame.at >= progress);
  if (nextIndex === -1) return pickMove(filled[filled.length - 1]);
  const from = filled[nextIndex - 1];
  const to = filled[nextIndex];
  const amount = smoothstep(from.at, to.at, progress);
  return {
    dolly: from.dolly + (to.dolly - from.dolly) * amount,
    orbit: from.orbit + (to.orbit - from.orbit) * amount,
    crane: from.crane + (to.crane - from.crane) * amount,
    focus: from.focus + (to.focus - from.focus) * amount,
  };
}

function pickMove({ dolly, orbit, crane, focus }) {
  return { dolly, orbit, crane, focus };
}
