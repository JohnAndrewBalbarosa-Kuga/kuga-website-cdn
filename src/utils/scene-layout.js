// Works out where the particle shape sits on screen for a scene.
// World units: (0, 0) is the screen centre; viewSize.width/height is the visible area.

import { getProduct } from '../config/products.js';
import { SCROLL_TURN } from '../config/theme.js';

export function getSceneLayout({ scene, progress, viewSize, reducedMotion }) {
  const placement = getPlacement(scene, viewSize);
  const product = getProduct(scene.shape);
  const restingRotation = product ? product.rotation : [0, 0, 0];
  const scale = product ? getProductScale(product, viewSize) : 1;
  const turn = getScrollTurn(scene, progress, reducedMotion);

  return {
    x: placement.x,
    y: placement.y,
    size: placement.size * scale,
    rotationX: restingRotation[0],
    rotationY: restingRotation[1] + turn,
    rotationZ: restingRotation[2],
  };
}

// phoneScale (optional, config/products.js) replaces scale on narrow screens, for wide shapes.
function getProductScale(product, viewSize) {
  if (Number.isFinite(product.phoneScale) && isNarrowScreen(viewSize)) return product.phoneScale;
  return product.scale;
}

function getScrollTurn(scene, progress, reducedMotion) {
  if (!scene.rotate) return 0;
  if (reducedMotion) return 0;
  return (progress - 0.5) * SCROLL_TURN;
}

function isNarrowScreen(viewSize) {
  return viewSize.width < viewSize.height * 0.9;
}

function getPlacement(scene, viewSize) {
  if (scene.shape === 'gather' && scene.targetElement) {
    return getElementPlacement(scene.targetElement, viewSize);
  }
  if (scene.side === 'full') {
    // data-shape-phone="top": on narrow screens the shape keeps to the top band, clear of the copy.
    if (scene.phoneSide === 'top' && isNarrowScreen(viewSize)) return { x: 0, y: viewSize.height * 0.33, size: viewSize.width };
    return { x: 0, y: 0, size: viewSize.width * 1.1 };
  }
  if (scene.side === 'centre') {
    return getCentrePlacement(viewSize);
  }
  return getSidePlacement(viewSize);
}

function getCentrePlacement(viewSize) {
  if (isNarrowScreen(viewSize)) {
    return { x: 0, y: viewSize.height * 0.15, size: viewSize.width * 0.85 };
  }
  return { x: 0, y: viewSize.height * 0.1, size: Math.min(viewSize.width * 0.7, 4.2) };
}

function getSidePlacement(viewSize) {
  if (isNarrowScreen(viewSize)) {
    return {
      x: 0,
      y: viewSize.height * 0.2,
      size: Math.min(viewSize.width * 0.75, viewSize.height * 0.34),
    };
  }
  return {
    x: viewSize.width * 0.14,
    y: 0,
    size: Math.min(viewSize.width * 0.3, viewSize.height * 0.6),
  };
}

// Converts an on-page element (the quote button) into a world-space placement.
function getElementPlacement(element, viewSize) {
  const rect = element.getBoundingClientRect();
  const centreX = rect.left + rect.width / 2;
  const centreY = rect.top + rect.height / 2;
  return {
    x: (centreX / viewSize.pixelWidth - 0.5) * viewSize.width,
    y: (0.5 - centreY / viewSize.pixelHeight) * viewSize.height,
    size: (rect.width / viewSize.pixelWidth) * viewSize.width * 1.15,
  };
}

export function getElementAspect(element) {
  if (!element) return 3;
  const rect = element.getBoundingClientRect();
  if (!rect.height) return 3;
  return rect.width / rect.height;
}
