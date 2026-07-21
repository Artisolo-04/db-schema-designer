import { collidesWithAny, COLLISION_PADDING } from '../../../utils/collision.js';

const ANIMATION_DURATION = 420; 

const SEARCH_STEP = COLLISION_PADDING;
const MAX_SEARCH_RADIUS = 2000;

function snapToGrid(value, gridSize) {
  return Math.round(value / gridSize) * gridSize;
}

function easeOutBack(t) {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

function findNearestFreePosition(cellId, currentPosition, size, otherRects, gridSize) {
  if (!collidesWithAny(cellId, currentPosition, size, otherRects, COLLISION_PADDING)) {
    return currentPosition;
  }
  for (let radius = SEARCH_STEP; radius <= MAX_SEARCH_RADIUS; radius += SEARCH_STEP) {
    const candidates = [
      { x: currentPosition.x, y: currentPosition.y + radius },
      { x: currentPosition.x + radius, y: currentPosition.y },
      { x: currentPosition.x, y: currentPosition.y - radius },
      { x: currentPosition.x - radius, y: currentPosition.y },
      { x: currentPosition.x + radius, y: currentPosition.y + radius },
      { x: currentPosition.x - radius, y: currentPosition.y + radius },
      { x: currentPosition.x + radius, y: currentPosition.y - radius },
      { x: currentPosition.x - radius, y: currentPosition.y - radius },
    ];
    for (const candidate of candidates) {
      const snapped = { x: snapToGrid(candidate.x, gridSize), y: snapToGrid(candidate.y, gridSize) };
      if (snapped.y < 0) continue;
      if (!collidesWithAny(cellId, snapped, size, otherRects, COLLISION_PADDING)) {
        return snapped;
      }
    }
  }
  return currentPosition; 
}

function animateElementTo(el, targetPosition, duration, onComplete) {
  const startPosition = el.position();
  if (startPosition.x === targetPosition.x && startPosition.y === targetPosition.y) {
    onComplete?.();
    return;
  }
  const startTime = performance.now();

  function step(now) {
    const elapsed = now - startTime;
    const t = Math.min(elapsed / duration, 1);
    const eased = easeOutBack(t);
    const x = startPosition.x + (targetPosition.x - startPosition.x) * eased;
    const y = startPosition.y + (targetPosition.y - startPosition.y) * eased;
    el.position(x, y);
    if (t < 1) {
      requestAnimationFrame(step);
    } else {
      onComplete?.();
    }
  }
  requestAnimationFrame(step);
}

export function resolveGrowthCollision({ el, otherRects, gridSize, onComplete }) {
  const position = el.position();
  const size = el.size();
  const nearestFree = findNearestFreePosition(el.id, position, size, otherRects, gridSize);
  const moved = nearestFree.x !== position.x || nearestFree.y !== position.y;
  animateElementTo(el, nearestFree, ANIMATION_DURATION, onComplete);
  return moved;
}
