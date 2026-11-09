// Adds custom GLSL to a built-in three.js material (MeshStandardMaterial etc.) without
// rewriting its shader. Code is inserted right after the named #include chunks.
//
// patchMaterial(material, {
//   cacheKey,                     unique per kind of patch, so three.js compiles it once
//   uniforms,                     shared uniform objects ({ uX: { value } })
//   vertexHeader, fragmentHeader  declarations put before the shader code
//   vertexAfter, fragmentAfter    { 'begin_vertex': 'glsl', ... }
// })

// A material can be patched more than once (solar glass has the sun glint, then the dissolve);
// each patch runs after the earlier ones and the cache keys are joined.
const patchedMaterials = new WeakSet();

export function patchMaterial(material, patch) {
  const isPatched = patchedMaterials.has(material);
  const earlierCompile = isPatched ? material.onBeforeCompile : null;
  const earlierKey = isPatched ? material.customProgramCacheKey() : '';

  material.onBeforeCompile = (shader, renderer) => {
    if (earlierCompile) earlierCompile(shader, renderer);
    Object.assign(shader.uniforms, patch.uniforms);
    shader.vertexShader = (patch.vertexHeader || '') + insertAfterChunks(shader.vertexShader, patch.vertexAfter);
    shader.fragmentShader = (patch.fragmentHeader || '') + insertAfterChunks(shader.fragmentShader, patch.fragmentAfter);
  };
  const cacheKey = earlierKey ? `${earlierKey}+${patch.cacheKey}` : patch.cacheKey;
  material.customProgramCacheKey = () => cacheKey;
  material.needsUpdate = true;
  patchedMaterials.add(material);
}

function insertAfterChunks(source, chunks = {}) {
  return Object.entries(chunks).reduce((code, [chunkName, glsl]) => {
    const include = `#include <${chunkName}>`;
    if (!code.includes(include)) return code;
    return code.replace(include, `${include}\n${glsl}`);
  }, source);
}

// Every material on a mesh or group, once each.
export function collectMaterials(root) {
  const materials = new Set();
  root.traverse((object) => {
    if (!object.isMesh) return;
    const list = Array.isArray(object.material) ? object.material : [object.material];
    list.forEach((material) => materials.add(material));
  });
  return Array.from(materials);
}
