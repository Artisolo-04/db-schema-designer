const DEFAULT_WIDTH = 320;
const DEFAULT_HEIGHT = 140;
const GRID_SIZE = 20;
const COLLISION_PADDING = 80;

export { COLLISION_PADDING };

function snapToGrid(value, gridSize = GRID_SIZE) {
  return Math.round(value / gridSize) * gridSize;
}

export function rectFromPosition(position, size) {
  return {
    left: position.x,
    right: position.x + size.width,
    top: position.y,
    bottom: position.y + size.height,
  };
}

export function getNodeRect(node, position = node.position) {
  const width = node.measured?.width ?? node.width ?? DEFAULT_WIDTH;
  const height = node.measured?.height ?? node.height ?? DEFAULT_HEIGHT;

  return {
    left: position.x,
    right: position.x + width,
    top: position.y,
    bottom: position.y + height,
  };
}

export function rectsOverlap(a, b, padding = 0) {
  return (
    a.left < b.right + padding &&
    a.right > b.left - padding &&
    a.top < b.bottom + padding &&
    a.bottom > b.top - padding
  );
}

export function collidesWithAny(cellId, newPosition, size, otherRects, padding = COLLISION_PADDING) {
  if (!otherRects || otherRects.length === 0) return false;

  const movingRect = {
    left: newPosition.x,
    right: newPosition.x + size.width,
    top: newPosition.y,
    bottom: newPosition.y + size.height,
  };

  for (const other of otherRects) {
    if (other.id === cellId) continue;

    if (rectsOverlap(movingRect, other, padding)) {
      return true;
    }
  }

  return false;
}

export function findFreePosition(otherRects, options = {}) {
  const {
    width = DEFAULT_WIDTH,
    height = DEFAULT_HEIGHT,
    startX = snapToGrid(80),
    startY = snapToGrid(80),
    gapX = snapToGrid(COLLISION_PADDING),
    gapY = snapToGrid(COLLISION_PADDING),
  } = options;

  const candidates = [{ x: startX, y: startY }];

  for (const other of otherRects) {
    candidates.push(
      { x: snapToGrid(other.right + gapX), y: snapToGrid(other.top) },
      { x: snapToGrid(other.left), y: snapToGrid(other.bottom + gapY) },
      { x: snapToGrid(startX), y: snapToGrid(other.bottom + gapY) }
    );
  }

  const seen = new Set();
  const probeSize = { width, height };

  for (const position of candidates) {
    const positionKey = `${position.x}:${position.y}`;
    if (seen.has(positionKey)) continue;
    seen.add(positionKey);

    if (!collidesWithAny('**probe**', position, probeSize, otherRects)) {
      return position;
    }
  }

  const lowestBottom = otherRects.reduce((max, rect) => {
    return Math.max(max, rect.bottom);
  }, startY);

  return { x: snapToGrid(startX), y: snapToGrid(lowestBottom + gapY) };
}
