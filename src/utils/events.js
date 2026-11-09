// Tiny event bus. Controllers talk to each other only through this.
//
// Events used:
//   'scene:change'   scene              a new [data-scene] section became active
//   'scene:progress' { scene, progress } 0..1 scroll progress through the active section
//   'frame'          { time, delta }    every animation frame (seconds)
//   'resize'         viewSize           { width, height, pixelWidth, pixelHeight, pixelRatio }
//   'pointer:move'   { x, y, active }   pointer in -1..1 (y up)
//   'product:phase'  { scene, phase }   product scene phase: converge | solidify | hold | shatter | null

export function createEventBus() {
  const listeners = new Map();

  function on(name, handler) {
    if (!listeners.has(name)) listeners.set(name, new Set());
    listeners.get(name).add(handler);
    return () => off(name, handler);
  }

  function off(name, handler) {
    const handlers = listeners.get(name);
    if (!handlers) return;
    handlers.delete(handler);
  }

  function emit(name, payload) {
    const handlers = listeners.get(name);
    if (!handlers) return;
    handlers.forEach((handler) => handler(payload));
  }

  return { on, off, emit };
}
