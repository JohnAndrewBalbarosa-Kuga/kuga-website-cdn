// Procedural stand-in for the "together" scene: a commercial site first, a home beside it.
//   warehouse (the hero): big low-pitch roof covered in solar, loading dock, rooftop plant
//   solar carport over four bays with two EV chargers
//   PowerStack battery cabinet at ground level by the warehouse wall
//   the house from shapes/house.js, smaller, at the front left ("big sites first, small sites welcome")
// Units: one unit ~ 12 m (the house is about 1 wide before LAYOUT.house.scale). Ground at y = 0.
//
// anchors (group.userData.anchors) are named points the camera can aim at; normaliseProduct()
// carries them into model space. The "together" camera move starts on the house (config/camera-moves.js).

import * as THREE from 'three';
import { limitShatterPieces } from './mesh-helpers.js';
import { buildWarehouse } from './warehouse.js';
import { buildSolarCarport } from './solar-carport.js';
import { buildMesh as buildHouse } from './house.js';
import { buildMesh as buildPowerStack } from './battery-powerstack.js';

// position [x, y, z], rotationY in radians, scale. The PowerStack is built in metres (1 / 12 here).
// shatterPieces: about how many fragments that part breaks into (its detail is tiny at this scale).
const LAYOUT = {
  house: { position: [-2.7, 0, 1.75], rotationY: 0.2, scale: 0.7, shatterPieces: 700 },
  carport: { position: [2.9, 0, 0.75], rotationY: 0 },
  powerStack: { position: [2.36, 0, -0.65], rotationY: 0, scale: 1 / 12, shatterPieces: 160 },
};

// Where the camera aims when it frames the house: its middle, a little above the eaves.
const HOUSE_FOCUS_HEIGHT = 0.36;

export function buildMesh({ textureSize = 2048 } = {}) {
  const group = new THREE.Group();
  group.add(buildWarehouse({ textureSize }));
  group.add(place(buildSolarCarport({ textureSize }), LAYOUT.carport));
  group.add(place(limitShatterPieces(buildPowerStack(), LAYOUT.powerStack.shatterPieces), LAYOUT.powerStack));
  group.add(place(limitShatterPieces(buildHouse({ textureSize }), LAYOUT.house.shatterPieces), LAYOUT.house));

  const [houseX, , houseZ] = LAYOUT.house.position;
  group.userData.anchors = { house: new THREE.Vector3(houseX, HOUSE_FOCUS_HEIGHT * LAYOUT.house.scale, houseZ) };
  return group;
}

function place(part, { position, rotationY = 0, scale = 1 }) {
  part.position.set(...position);
  part.rotation.y = rotationY;
  part.scale.setScalar(scale);
  return part;
}
