import { useMemo } from 'react';
import { BaseEdge, useNodes } from '@xyflow/react';
import {
  getSmartEdge,
  pathfindingJumpPointNoDiagonal,
} from '@jalez/react-flow-smart-edge';

const FALLBACK_WIDTH = 280;
const FALLBACK_HEIGHT = 152;
const CORNER_RADIUS = 18;
const PADDING_CANDIDATES = [30, 20, 12, 6, 2];

function manhattan(a, b) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function simplifyOrthogonalPoints(points) {
  if (points.length < 3) return points;

  const result = [points[0]];
  for (let i = 1; i < points.length - 1; i += 1) {
    const previous = result[result.length - 1];
    const current = points[i];
    const next = points[i + 1];
    const collinear =
      (previous.x === current.x && current.x === next.x) ||
      (previous.y === current.y && current.y === next.y);

    if (!collinear) result.push(current);
  }
  result.push(points[points.length - 1]);
  return result;
}

function svgDrawRoundedPath(source, target, path) {
  const rawPoints = path.map(([x, y]) => ({ x, y }));
  const points = simplifyOrthogonalPoints(rawPoints);

  if (points.length === 0) return '';
  if (points.length < 3) {
    return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  }

  const commands = [`M ${points[0].x} ${points[0].y}`];

  for (let i = 1; i < points.length - 1; i += 1) {
    const previous = points[i - 1];
    const current = points[i];
    const next = points[i + 1];

    const isTurn = previous.x === current.x
      ? next.x !== current.x
      : next.y !== current.y;

    if (!isTurn) {
      commands.push(`L ${current.x} ${current.y}`);
      continue;
    }

    const radius = Math.min(CORNER_RADIUS, manhattan(previous, current) / 2, manhattan(current, next) / 2);
    const before = {
      x: current.x + (previous.x === current.x ? 0 : previous.x > current.x ? radius : -radius),
      y: current.y + (previous.y === current.y ? 0 : previous.y > current.y ? radius : -radius),
    };
    const after = {
      x: current.x + (next.x === current.x ? 0 : next.x > current.x ? radius : -radius),
      y: current.y + (next.y === current.y ? 0 : next.y > current.y ? radius : -radius),
    };

    commands.push(`L ${before.x} ${before.y}`);
    commands.push(`Q ${current.x} ${current.y} ${after.x} ${after.y}`);
  }

  const last = points[points.length - 1];
  commands.push(`L ${last.x} ${last.y}`);
  return commands.join(' ');
}

function resolvePorts(sourceNode, targetNode, sourceX, targetX) {
  if (!sourceNode || !targetNode) {
    const sourceIsLeft = sourceX <= targetX;
    return {
      sourceX,
      targetX,
      sourceSide: sourceIsLeft ? 'right' : 'left',
      targetSide: sourceIsLeft ? 'left' : 'right',
    };
  }

  const sourceRect = getNodeRectLocal(sourceNode);
  const targetRect = getNodeRectLocal(targetNode);
  const sourceCenterX = (sourceRect.left + sourceRect.right) / 2;
  const targetCenterX = (targetRect.left + targetRect.right) / 2;
  const sourceIsLeft = sourceCenterX <= targetCenterX;

  return {
    sourceX: sourceIsLeft ? sourceRect.right : sourceRect.left,
    targetX: sourceIsLeft ? targetRect.left : targetRect.right,
    sourceSide: sourceIsLeft ? 'right' : 'left',
    targetSide: sourceIsLeft ? 'left' : 'right',
  };
}

function getNodeRectLocal(node) {
  const width = node.measured?.width ?? node.width ?? FALLBACK_WIDTH;
  const height = node.measured?.height ?? node.height ?? FALLBACK_HEIGHT;
  return {
    left: node.position.x,
    right: node.position.x + width,
    top: node.position.y,
    bottom: node.position.y + height,
  };
}

function premiumEdgeStyle(selected, style) {
  return {
    fill: 'none',
    stroke: selected ? '#a78bfa' : '#7357ff',
    strokeWidth: selected ? 2.5 : 1.8,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    filter: selected
      ? 'drop-shadow(0 0 6px rgba(167, 139, 250, 0.52))'
      : 'drop-shadow(0 1px 2px rgba(20, 16, 50, 0.35))',
    transition: 'stroke 140ms ease, stroke-width 140ms ease, filter 200ms ease',
    ...style,
  };
}

function routeWithFallbackPadding({ sourcePosition, targetPosition, sourceX, sourceY, targetX, targetY, nodes }) {
  for (const nodePadding of PADDING_CANDIDATES) {
    const result = getSmartEdge({
      sourcePosition,
      targetPosition,
      sourceX,
      sourceY,
      targetX,
      targetY,
      nodes,
      options: {
        nodePadding,
        gridRatio: 10,
        generatePath: pathfindingJumpPointNoDiagonal,
        drawEdge: svgDrawRoundedPath,
      },
    });
    if (result) return result;
  }
  return null;
}

export default function RelationshipEdge({
  id,
  source,
  target,
  sourceX,
  sourceY,
  targetX,
  targetY,
  selected,
  markerEnd,
  style,
}) {
  const nodes = useNodes();
  const sourceNode = nodes.find((node) => node.id === source);
  const targetNode = nodes.find((node) => node.id === target);

  const nodesForRouting = useMemo(
    () =>
      nodes.map((node) => ({
        ...node,
        width: node.measured?.width ?? node.width ?? FALLBACK_WIDTH,
        height: node.measured?.height ?? node.height ?? FALLBACK_HEIGHT,
      })),
    [nodes]
  );

  const ports = useMemo(
    () => resolvePorts(sourceNode, targetNode, sourceX, targetX),
    [sourceNode, targetNode, sourceX, targetX]
  );

  const smartEdge = useMemo(
    () =>
      routeWithFallbackPadding({
        sourcePosition: ports.sourceSide,
        targetPosition: ports.targetSide,
        sourceX: ports.sourceX,
        sourceY,
        targetX: ports.targetX,
        targetY,
        nodes: nodesForRouting,
      }),
    [nodesForRouting, ports.sourceSide, ports.targetSide, ports.sourceX, ports.targetX, sourceY, targetY]
  );

  const edgePath =
    smartEdge?.svgPathString ?? `M ${ports.sourceX} ${sourceY} L ${ports.targetX} ${targetY}`;

  return (
    <BaseEdge
      id={id}
      path={edgePath}
      markerEnd={markerEnd}
      style={premiumEdgeStyle(selected, style)}
      className={selected ? 'edge-flowing edge-premium' : 'edge-premium'}
    />
  );
}
