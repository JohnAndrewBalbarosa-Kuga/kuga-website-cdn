// A small three.js stage for one product: transparent renderer with ACES tone mapping, a camera,
// and the homepage's studio lighting (RoomEnvironment reflections, key, fill and rim lights;
// a hemisphere light instead of the environment on the low tier). No shadows (no floor to catch them).

import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { normaliseProduct } from '../src/utils/product-geometry.js';
import { LIGHTING, PRODUCT_HERO } from './config.js';

export function createProductScene(canvas, quality) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: quality.antialias, alpha: true, powerPreference: 'low-power' });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = LIGHTING.exposure;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, quality.maxPixelRatio));
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(PRODUCT_HERO.fov, 1, 0.1, 50);
  camera.position.set(0, 0, PRODUCT_HERO.distance);
  addLights(scene, renderer, quality);

  const pivot = new THREE.Group();
  scene.add(pivot);

  function setProduct(rawGroup, scale) {
    const model = normaliseProduct(rawGroup, { scale });
    pivot.add(model);
    return collectGlints(model);
  }

  function resize(width, height) {
    renderer.setSize(width, height, false);
    camera.aspect = width / Math.max(height, 1);
    // Keep the whole unit box in view on narrow canvases too.
    camera.position.z = PRODUCT_HERO.distance * Math.max(1, 1 / camera.aspect);
    camera.updateProjectionMatrix();
  }

  return {
    pivot,
    setProduct,
    resize,
    render: () => renderer.render(scene, camera),
    dispose: () => renderer.dispose(),
  };
}

function addLights(scene, renderer, quality) {
  if (quality.environment) {
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = LIGHTING.environmentIntensity;
    pmrem.dispose();
  } else {
    const { sky, ground, intensity } = LIGHTING.hemisphere;
    scene.add(new THREE.HemisphereLight(sky, ground, intensity));
  }
  [LIGHTING.key, LIGHTING.fill, LIGHTING.rim].forEach(({ colour, intensity, position }) => {
    const light = new THREE.DirectionalLight(colour, intensity);
    light.position.set(...position);
    scene.add(light);
  });
}

// The sun-glint uniforms on solar glass (src/utils/glint-material.js), so scroll can sweep them.
function collectGlints(model) {
  const glints = new Set();
  model.traverse((object) => {
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    materials.forEach((material) => {
      if (material && material.userData && material.userData.glint) glints.add(material.userData.glint);
    });
  });
  return [...glints];
}
