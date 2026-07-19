import { Table, Relationship, manhattanRouter } from '../joint/shapes.js';

export function loadInitialGraph({ graph, resizeForColumns, GRID_SIZE, initialNodes, initialEdges }) {
  function snapToGrid(position) {
    return {
      x: Math.round(position.x / GRID_SIZE) * GRID_SIZE,
      y: Math.round(position.y / GRID_SIZE) * GRID_SIZE,
    };
  }

  const sortedInitialNodes = [...initialNodes].sort((a, b) => String(a.id).localeCompare(String(b.id)));
  sortedInitialNodes.forEach((node) => {
    const el = new Table({ id: node.id, position: snapToGrid(node.position), data: node.data });
    resizeForColumns(el);
    el.addTo(graph);
  });

  function tableHasPort(elementId, portId) {
    const el = graph.getCell(elementId);
    if (!el) return false;
    return (el.get('data')?.columns || []).some((c) => `${c.id}__left` === portId || `${c.id}__right` === portId);
  }

  const sortedInitialEdges = [...initialEdges].sort((a, b) => String(a.id).localeCompare(String(b.id)));
  sortedInitialEdges.forEach((edge) => {
    const data = edge.data || {};
    if (!data.sourceColumnId || !data.targetColumnId) {
      console.warn('[Canvas] Skipped edge with missing column ids:', edge);
      return;
    }
    const sourceSide = data.sourceSide || 'right';
    const targetSide = data.targetSide || 'left';
    const sourcePort = `${data.sourceColumnId}__${sourceSide}`;
    const targetPort = `${data.targetColumnId}__${targetSide}`;
    if (!tableHasPort(edge.source, sourcePort) || !tableHasPort(edge.target, targetPort)) {
      console.warn('[Canvas] Skipped stale relationship:', edge);
      return;
    }
    new Relationship({
      id: edge.id,
      source: { id: edge.source, port: sourcePort },
      target: { id: edge.target, port: targetPort },
      router: manhattanRouter(sourcePort, targetPort),
      data,
    }).addTo(graph);
  });
}
