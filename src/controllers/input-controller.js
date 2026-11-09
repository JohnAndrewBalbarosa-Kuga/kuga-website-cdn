/**
 * Input controller
 * Tracks the pointer (mouse or finger) as -1..1 on both axes, y pointing up.
 *
 * Public methods:
 *   getPointer() -> { x, y, active }
 *
 * Emits: 'pointer:move' { x, y, active }
 */

export function createInputController({ events, enabled = true }) {
  const pointer = { x: 0, y: 0, active: false };

  if (enabled) {
    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('pointerdown', handlePointerMove, { passive: true });
    window.addEventListener('pointerup', handlePointerEnd, { passive: true });
    window.addEventListener('pointercancel', handlePointerEnd, { passive: true });
    document.documentElement.addEventListener('pointerleave', handlePointerEnd);
  }

  function handlePointerMove(event) {
    pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
    pointer.y = 1 - (event.clientY / window.innerHeight) * 2;
    pointer.active = true;
    events.emit('pointer:move', { ...pointer });
  }

  // Touch has no hover, so the push stops when the finger lifts.
  function handlePointerEnd(event) {
    if (event.pointerType === 'mouse' && event.type === 'pointerup') return;
    pointer.active = false;
    events.emit('pointer:move', { ...pointer });
  }

  return {
    getPointer: () => ({ ...pointer }),
  };
}
