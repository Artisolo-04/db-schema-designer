import { BaseEdge, getSmoothStepPath, useNodes } from '@xyflow/react';

const FALLBACK_WIDTH = 280;
const FALLBACK_HEIGHT = 160;
const CLEARANCE = 28; 

function getRect(node) {
  const width = node.measured?.width ?? node.width ?? FALLBACK_WIDTH;
  const height = node.measured?.height ?? node.height ?? FALLBACK_HEIGHT;
  const { x, y } = node.position;
  return { left: x, right: x + width, top: y, bottom: y + height };
}

function overlapsHorizontally(a, b) {
  return a.left < b.right && a.right > b.left;
}

export default function AvoidEdge({
  id,
  source,
  target,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style,
  markerEnd,
}) {
  const nodes = useNodes();

  const span = {
    left: Math.min(sourceX, targetX),
    right: Math.max(sourceX, targetX),
  };

  const obstacles = nodes
    .filter((n) => n.id !== source && n.id !== target)
    .map(getRect)
    .filter((rect) => overlapsHorizontally(span, rect));

  let centerY;
  if (obstacles.length > 0) {
    const clearAbove = Math.min(...obstacles.map((o) => o.top)) - CLEARANCE;
    const clearBelow = Math.max(...obstacles.map((o) => o.bottom)) + CLEARANCE;
    const midY = (sourceY + targetY) / 2;
    
    centerY = Math.abs(clearAbove - midY) <= Math.abs(clearBelow - midY) ? clearAbove : clearBelow;
  }

  const [path] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 10,
    ...(centerY !== undefined ? { centerY } : {}),
  });

  return <BaseEdge id={id} path={path} style={style} markerEnd={markerEnd} />;
}
