// Small maths helpers shared by the controllers.

export function clamp01(value) {
  return Math.min(1, Math.max(0, value));
}

export function smoothstep(edge0, edge1, value) {
  const t = clamp01((value - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

// 0 before the range, 1 after it, linear inside. range = [start, end].
export function progressInRange(value, [start, end]) {
  if (end <= start) return value >= end ? 1 : 0;
  return clamp01((value - start) / (end - start));
}

export function easeOutQuad(t) {
  return 1 - (1 - t) * (1 - t);
}

export function randomDirection() {
  const angle = Math.random() * Math.PI * 2;
  const height = Math.random() * 2 - 1;
  const ring = Math.sqrt(1 - height * height);
  return [Math.cos(angle) * ring, height, Math.sin(angle) * ring];
}

export function hexToRgb(hex) {
  const value = parseInt(hex.replace('#', ''), 16);
  return [((value >> 16) & 255) / 255, ((value >> 8) & 255) / 255, (value & 255) / 255];
}
