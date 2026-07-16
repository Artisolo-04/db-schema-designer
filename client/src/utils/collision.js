const DEFAULT_WIDTH = 280;
const DEFAULT_HEIGHT = 152;

export const COLLISION_PADDING = 80;

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

export function collidesWithAny(node, position, allNodes, padding = COLLISION_PADDING) {
  const movingRect = getNodeRect(node, position);

  return allNodes.some((other) => {
    if (other.id === node.id) return false;
    return rectsOverlap(movingRect, getNodeRect(other), padding);
  });
}

export function findFreePosition(existingNodes, options = {}) {
  const {
    width = DEFAULT_WIDTH,
    height = DEFAULT_HEIGHT,
    startX = 80,
    startY = 80,
    gapX = 40,
    gapY = 40,
  } = options;

  const probeNode = {
    id: '**probe**',
    width,
    height,
    position: { x: 0, y: 0 },
  };

  const candidates = [{ x: startX, y: startY }];

  for (const node of existingNodes) {
    const rect = getNodeRect(node);

    candidates.push(
      { x: rect.right + gapX, y: rect.top },
      { x: rect.left, y: rect.bottom + gapY },
      { x: startX, y: rect.bottom + gapY }
    );
  }

  const seen = new Set();

  for (const position of candidates) {
    const positionKey = `${position.x}:${position.y}`;
    if (seen.has(positionKey)) continue;
    seen.add(positionKey);

    if (!collidesWithAny(probeNode, position, existingNodes)) {
      return position;
    }
  }

  const lowestBottom = existingNodes.reduce((max, node) => {
    return Math.max(max, getNodeRect(node).bottom);
  }, startY);

  return { x: startX, y: lowestBottom + gapY };
}
