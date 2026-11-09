// Product id (data-product-hero) -> the homepage's procedural mesh in src/shapes/ (read only).
// Each builder is loaded only when a page asks for it.

const BUILDERS = {
  'solar-panel': () => import('../src/shapes/solar-panel.js'),
  'battery-sbr': () => import('../src/shapes/battery-sbr.js'),
  'battery-powerstack': () => import('../src/shapes/battery-powerstack.js'),
  inverter: () => import('../src/shapes/inverter.js'),
  'hot-water': () => import('../src/shapes/hot-water.js'),
  'ev-charger': () => import('../src/shapes/ev-charger.js'),
};

export function isKnownProduct(id) {
  return Object.hasOwn(BUILDERS, id);
}

// Returns the raw THREE.Group from the shape's buildMesh().
export async function buildProduct(id, textureSize) {
  const { buildMesh } = await BUILDERS[id]();
  return buildMesh({ textureSize });
}
