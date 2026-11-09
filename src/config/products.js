// Product id -> display name, model file, procedural stand-in and display transform.
// The id matches data-shape on the section and the id in models/manifest.json.
// buildStandIn() returns a THREE.Group used until a real model is listed in the manifest.
// scale multiplies the on-screen size; rotation is the resting angle in radians [x, y, z].
// buildStandIn({ textureSize }) gets the quality tier's texture width.
// holdSpin (optional): whole turns the solid model makes during the hold phase (SOLID.spinRange),
// so the back is seen too.
// phoneScale (optional): replaces scale on narrow (portrait) screens, for wide shapes.
// holdTurn (optional): overrides SOLID.holdTurn (theme.js); 0 keeps the model still while the camera moves.

import { buildMesh as buildSolarPanel } from '../shapes/solar-panel.js';
import { buildMesh as buildBatterySbr } from '../shapes/battery-sbr.js';
import { buildMesh as buildBatteryPowerstack } from '../shapes/battery-powerstack.js';
import { buildMesh as buildInverter } from '../shapes/inverter.js';
import { buildMesh as buildHotWater } from '../shapes/hot-water.js';
import { buildMesh as buildEvCharger } from '../shapes/ev-charger.js';
import { buildMesh as buildHouse } from '../shapes/house.js';
import { buildMesh as buildCommercialSite } from '../shapes/commercial-site.js';

export const PRODUCTS = {
  'solar-panel': {
    name: 'Solar panel',
    modelFile: 'solar-panel.glb',
    buildStandIn: buildSolarPanel,
    scale: 1,
    rotation: [0.15, -0.5, 0],
    holdSpin: 1,
  },
  // Stackable high-voltage battery, 5 modules (Sungrow SBR160). Its layers land one by one (STACK_LANDING).
  'battery-sbr': {
    name: 'Stackable battery',
    modelFile: 'battery-sbr.glb',
    buildStandIn: buildBatterySbr,
    scale: 0.95,
    rotation: [0.12, -0.6, 0],
  },
  // Outdoor commercial battery cabinet, 225 kWh (Sungrow PowerStack ST225kWh-110kW-2h).
  'battery-powerstack-225': {
    name: 'Commercial battery cabinet',
    modelFile: 'battery-powerstack-225.glb',
    buildStandIn: buildBatteryPowerstack,
    scale: 1,
    rotation: [0.12, -0.6, 0],
  },
  inverter: {
    name: 'Inverter',
    modelFile: 'inverter.glb',
    buildStandIn: buildInverter,
    scale: 0.9,
    rotation: [0.1, -0.5, 0],
  },
  // Commercial hot water storage tank (the tank only, not the heat pump unit).
  'hot-water': {
    name: 'Hot water tank',
    modelFile: 'hot-water.glb',
    buildStandIn: buildHotWater,
    scale: 1,
    rotation: [0.12, -0.5, 0],
  },
  'ev-charger': {
    name: 'EV charger',
    modelFile: 'ev-charger.glb',
    buildStandIn: buildEvCharger,
    scale: 0.95,
    rotation: [0.05, -0.4, 0],
  },
  house: {
    name: 'House',
    modelFile: 'house.glb',
    buildStandIn: buildHouse,
    scale: 0.9,
    rotation: [0.25, -0.6, 0],
  },
  // The "together" scene: warehouse with a big roof array, solar carport with EV chargers, PowerStack
  // and a small house. Held still (holdTurn 0) because the camera dollies from the house to the site.
  'commercial-site': {
    name: 'Commercial site',
    modelFile: 'commercial-site.glb',
    buildStandIn: buildCommercialSite,
    scale: 1.3,
    phoneScale: 0.95,
    rotation: [0.32, -0.5, 0],
    holdTurn: 0,
  },
};

export function getProduct(id) {
  return PRODUCTS[id] || null;
}
