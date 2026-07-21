import { dia } from '@joint/core';
import { Relationship } from '../joint/shapes.js';

function relationshipKey(sourceColumnId, targetColumnId) {
  return [sourceColumnId, targetColumnId].sort().join('::');
}

export function createGraphAndPaper({ paperEl, GRID_SIZE, namespace }) {
  const graph = new dia.Graph({}, { cellNamespace: namespace });
  const paper = new dia.Paper({
    el: paperEl,
    model: graph,
    width: 1,
    height: 1,
    background: { color: '#0d0d12' },
    sorting: dia.Paper.sorting.EXACT,
    gridSize: GRID_SIZE,
    drawGrid: { name: 'dot', args: { color: '#2c2c38', thickness: 1.5 } },
    cellViewNamespace: namespace,
    defaultLink: () => new Relationship(),
    defaultRouter: { name: 'manhattan', args: { padding: 40, step: GRID_SIZE, startDirections: ['left','right'], endDirections: ['left','right'] } },
    defaultConnectionPoint: { name: 'boundary' },
    linkPinning: false,
    snapLinks: { radius: 20 },

    connectionStrategy: (end, view, magnet) => {
      if (magnet && magnet.getAttribute('port')) return end;
      return end;
    },
    markAvailable: true,
    interactive: (cellView) => (cellView.model.isLink() ? { vertexAdd: false } : true),
    validateConnection: (srcView, srcMagnet, tgtView, tgtMagnet) => {
      if (!srcMagnet || !tgtMagnet) return false;
      const sourcePortId = srcMagnet.getAttribute('port');
      const targetPortId = tgtMagnet.getAttribute('port');
      if (!sourcePortId || !targetPortId) return false;
      const sourceColumnId = sourcePortId.replace(/__(left|right)$/, '');
      const targetColumnId = targetPortId.replace(/__(left|right)$/, '');

      if (sourceColumnId === targetColumnId) return false;
      const key = relationshipKey(sourceColumnId, targetColumnId);
      const exists = graph.getLinks().some(
        (l) => relationshipKey(l.get('data')?.sourceColumnId, l.get('data')?.targetColumnId) === key
      );
      return !exists;
    },
  });

  return { graph, paper };
}
