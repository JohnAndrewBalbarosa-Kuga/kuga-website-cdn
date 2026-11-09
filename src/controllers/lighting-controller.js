/**
 * Lighting controller
 * Studio product-shot lighting for the solid models: RoomEnvironment reflections through PMREM,
 * a key light (the only shadow caster), a shadow-free fill and a rim light for edges on white.
 * Low quality tiers skip the environment map (a hemisphere light stands in) and shadows.
 * Settings live in LIGHTING in config/theme.js. The particles are not affected.
 *
 * Public methods: none (it sets up lights once).
 */

import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { LIGHTING } from '../config/theme.js';

export function createLightingController({ render, quality }) {
  const scene = render.getScene();
  const renderer = render.getRenderer();

  addEnvironmentOrHemisphere();
  addKeyLight();
  addLight(LIGHTING.fill);
  addLight(LIGHTING.rim);

  function addEnvironmentOrHemisphere() {
    if (renderer && quality.environment) {
      const pmrem = new THREE.PMREMGenerator(renderer);
      scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
      scene.environmentIntensity = LIGHTING.environmentIntensity;
      pmrem.dispose();
      return;
    }
    const { sky, ground, intensity } = LIGHTING.hemisphere;
    scene.add(new THREE.HemisphereLight(sky, ground, intensity));
  }

  function addKeyLight() {
    const key = addLight(LIGHTING.key);
    if (!quality.shadows) return;
    const size = LIGHTING.shadowCameraSize;
    key.castShadow = true;
    key.shadow.mapSize.set(quality.shadowMapSize, quality.shadowMapSize);
    key.shadow.camera.left = -size;
    key.shadow.camera.right = size;
    key.shadow.camera.top = size;
    key.shadow.camera.bottom = -size;
    key.shadow.camera.near = 0.5;
    key.shadow.camera.far = 30;
    key.shadow.bias = -0.0004;
    key.shadow.normalBias = 0.02;
  }

  function addLight({ colour, intensity, position }) {
    const light = new THREE.DirectionalLight(colour, intensity);
    light.position.set(...position);
    scene.add(light);
    return light;
  }

  return {};
}
