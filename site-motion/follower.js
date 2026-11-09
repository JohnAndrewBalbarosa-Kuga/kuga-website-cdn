// An eased value that chases a target: lerp toward it each frame, with a top speed, and a
// slower catch-up while the page scrolls fast. Scroll-linked effects use it so a hard flick
// glides instead of jumping (no flicker). Settings: FOLLOW in config.js.

import { FOLLOW } from './config.js';

export function createFollower(startValue = 0, settings = FOLLOW) {
  let value = startValue;

  // target: where the value should end up. scrollSpeed: px/s. seconds: time since last frame.
  function update(target, scrollSpeed, seconds) {
    const [slowFrom, slowTo] = settings.fastVelocity;
    const fastShare = clamp((Math.abs(scrollSpeed) - slowFrom) / (slowTo - slowFrom), 0, 1);
    const lerp = settings.lerp * (1 - fastShare * (1 - settings.fastLerpFactor));
    const blend = 1 - Math.pow(1 - lerp, seconds * 60);
    const maxStep = settings.maxStepPerSecond * seconds;
    value += clamp((target - value) * blend, -maxStep, maxStep);
    if (Math.abs(target - value) < 0.0001) value = target;
    return value;
  }

  return {
    update,
    get value() {
      return value;
    },
    snap(newValue) {
      value = newValue;
    },
  };
}

function clamp(number, min, max) {
  return Math.min(max, Math.max(min, number));
}
