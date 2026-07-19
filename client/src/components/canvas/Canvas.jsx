import { useEffect, useRef } from 'react';
import { dia } from '@joint/core';
import { Table, Relationship, buildPortItems, computeTableHeight, TABLE_WIDTH, setSelected, manhattanRouter } from './joint/shapes.js';
import TableElementView from './joint/TableElementView.jsx';
import { createDefaultTable } from '../../utils/schemaDefaults.js';
import { collidesWithAny, findFreePosition, rectFromPosition } from '../../utils/collision.js';
import { setupMinimap } from './hooks/setupMinimap.js';
import { setupZoom } from './hooks/setupZoom.js';
import { setupSelection } from './hooks/setupSelection.js';
import { setupDragAndPan } from './hooks/setupDragAndPan.js';
import { setupResizeObserver } from './hooks/setupResizeObserver.js';
import { loadInitialGraph } from './hooks/loadInitialGraph.js';
import { setupGlobalReroute } from './hooks/setupGlobalReroute.js';
import { createGraphAndPaper } from './hooks/createGraphAndPaper.js';

function relationshipKey(sourceColumnId, targetColumnId) {
  return [sourceColumnId, targetColumnId].sort().join('::');
}

const namespace = { app: { Table, Relationship, TableView: TableElementView } };

export default function Canvas({ initialNodes = [], initialEdges = [], onAddTableRef, onChange }) {
  const containerRef = useRef(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const zoomActionsRef = useRef({});
  const minimapContainerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const paperEl = document.createElement('div');
    paperEl.className = 'w-full h-full';
    container.appendChild(paperEl);

    function blurActiveInput() {
      const active = document.activeElement;
      if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) {
        active.blur();
      }
    }

    const GRID_SIZE = 20;
    const { graph, paper } = createGraphAndPaper({ paperEl, GRID_SIZE, namespace });

    function otherRects(excludeId) {
      return graph
        .getElements()
        .filter((el) => el.id !== excludeId)
        .map((el) => ({ id: el.id, ...rectFromPosition(el.position(), el.size()) }));
    }

    function resizeForColumns(el) {

      const columns = el.get('data')?.columns || [];
      const nextPorts = buildPortItems(columns);
      const nextIds = new Set(nextPorts.map((p) => p.id));
      const existingPorts = el.getPorts();
      const existingIds = existingPorts.map((p) => p.id);
      const existingIdSet = new Set(existingIds);

      graph.startBatch('resize-columns');

      el.resize(TABLE_WIDTH, computeTableHeight(columns.length));

      const toRemove = existingIds.filter((id) => !nextIds.has(id));
      if (toRemove.length) {
        el.removePorts(toRemove);
      }

      const toAdd = nextPorts.filter((p) => !existingIdSet.has(p.id));
      if (toAdd.length) {
        el.addPorts(toAdd);
      }

      nextPorts.forEach((p) => {
        if (existingIdSet.has(p.id)) {
          el.portProp(p.id, 'args', p.args);
        }
      });

      graph.stopBatch('resize-columns');
    }

    function emitChange() {

      const nodes = graph.getElements().map((el) => ({
        id: el.id,
        type: 'tableNode',
        position: el.position(),
        data: el.get('data'),
      }));

      const edges = graph.getLinks().map((link) => {
        const data = link.get('data') || {};
        return {
          id: link.id,
          source: link.get('source').id,
          sourceHandle: data.sourceColumnId ? `${data.sourceColumnId}__${data.sourceSide || 'right'}` : undefined,
          target: link.get('target').id,
          targetHandle: data.targetColumnId ? `${data.targetColumnId}__${data.targetSide || 'left'}` : undefined,
          type: 'relationshipEdge',
          data,
        };
      });
      onChangeRef.current?.(nodes, edges);
    }

    function renderAllTables() {

      const elements = graph.getElements();
      const allTables = elements.map((el) => ({ id: el.id, data: el.get('data') }));
      elements.forEach((el) => {
        paper.findViewByModel(el)?.renderReact?.({
          allTables,
          onUpdateData,
          onDeleteTable,
          onCreateRelationship,
          bringToFront,
        });
      });
    }

    const { zoomBy, zoomToFit, teardownZoom } = setupZoom({ graph, paper, container });

    zoomActionsRef.current = {
      zoomIn: () => zoomBy(0.15),
      zoomOut: () => zoomBy(-0.15),
      fit: zoomToFit,
    };

    const minimapContainer = minimapContainerRef.current;
    const teardownMinimap = setupMinimap({ graph, paper, container, minimapContainer });

    function bringToFront(id) {
      const el = graph.getCell(id);
      if (el) el.toFront();
    }

    function onUpdateData(id, updater) {

      const el = graph.getCell(id);
      if (!el) return;
      const previousData = el.get('data') || {};
      const nextData = updater(previousData);
      const remainingColumnIds = new Set((nextData.columns || []).map((column) => column.id));
      const deletedColumnIds = new Set(
        (previousData.columns || [])
          .map((column) => column.id)
          .filter((columnId) => !remainingColumnIds.has(columnId))
      );
      graph.getLinks()
        .filter((link) => {
          const data = link.get('data') || {};
          return deletedColumnIds.has(data.sourceColumnId) || deletedColumnIds.has(data.targetColumnId);
        })
        .forEach((link) => link.remove());

      const previousTypeById = new Map((previousData.columns || []).map((c) => [c.id, c.type]));

      const changedTypeColumnIds = (nextData.columns || [])
        .filter((c) => previousTypeById.has(c.id) && previousTypeById.get(c.id) !== c.type)
        .map((c) => c.id);

      el.set('data', nextData);
      resizeForColumns(el);
      renderAllTables();
      emitChange();

      changedTypeColumnIds.forEach((columnId) => {
        const newType = (nextData.columns || []).find((c) => c.id === columnId)?.type;
        if (!newType) return;
        graph.getLinks().forEach((link) => {
          const linkData = link.get('data') || {};
          if (linkData.targetColumnId !== columnId) return;
          const sourceElId = link.get('source')?.id;
          const sourceColumnId = linkData.sourceColumnId;
          if (!sourceElId || !sourceColumnId) return;
          const sourceEl = graph.getCell(sourceElId);
          const sourceColumn = (sourceEl?.get('data')?.columns || []).find((c) => c.id === sourceColumnId);
          if (sourceColumn && sourceColumn.type !== newType) {
            onUpdateData(sourceElId, (data) => ({
              ...data,
              columns: (data.columns || []).map((c) =>
                c.id === sourceColumnId ? { ...c, type: newType } : c
              ),
            }));
          }
        });
      });
    }

    function onDeleteTable(id) {
      graph.getCell(id)?.remove();
      renderAllTables();
    }

    function onCreateRelationship(sourceColumnId, targetColumnId) {

      const key = relationshipKey(sourceColumnId, targetColumnId);
      const exists = graph.getLinks().some(
        (l) => relationshipKey(l.get('data')?.sourceColumnId, l.get('data')?.targetColumnId) === key
      );
      if (exists) return;
      const sourceEl = graph.getElements().find((el) => (el.get('data')?.columns || []).some((c) => c.id === sourceColumnId));
      const targetEl = graph.getElements().find((el) => (el.get('data')?.columns || []).some((c) => c.id === targetColumnId));
      if (!sourceEl || !targetEl) return;

      const targetColumn = (targetEl.get('data')?.columns || []).find((c) => c.id === targetColumnId);
      if (targetColumn) {
        onUpdateData(sourceEl.id, (data) => ({
          ...data,
          columns: (data.columns || []).map((c) =>
            c.id === sourceColumnId ? { ...c, type: targetColumn.type } : c
          ),
        }));
      }

      const sourcePort = `${sourceColumnId}__right`;
      const targetPort = `${targetColumnId}__left`;

      const newLink = new Relationship({
        source: { id: sourceEl.id, port: sourcePort },
        target: { id: targetEl.id, port: targetPort },
        router: manhattanRouter(sourcePort, targetPort),
        data: { sourceColumnId, targetColumnId, sourceSide: 'right', targetSide: 'left' },
      });

      newLink.addTo(graph);
      emitChange();
    }

    function addTable() {

      const wasEmpty = graph.getElements().length === 0;
      const position = findFreePosition(otherRects('**none**'));
      const { id, data } = createDefaultTable(position, []);
      const el = new Table({ id, position, data });
      resizeForColumns(el);
      el.addTo(graph);
      renderAllTables();
      emitChange();
      if (wasEmpty) {
        zoomToFit();
      }
    }

    if (onAddTableRef) onAddTableRef.current = addTable;

    const { teardownResizeObserver } = setupResizeObserver({ paper, container });

    loadInitialGraph({ graph, resizeForColumns, GRID_SIZE, initialNodes, initialEdges });
    renderAllTables();
    zoomToFit();

    const { teardownGlobalReroute } = setupGlobalReroute({ graph, paper });
    const { getSelectedCell, clearSelectionSelectedRef } = setupSelection({ graph, paper, setSelected, blurActiveInput });
    const { teardownDragAndPan } = setupDragAndPan({ graph, paper, container, GRID_SIZE, otherRects, emitChange, blurActiveInput });

    paper.on('link:connect', (linkView) => {

      const link = linkView.model;
      const source = link.get('source');
      const target = link.get('target');
      if (source?.port && target?.port) {
        const sourceMatch = source.port.match(/^(.*)__(left|right)$/);
        const targetMatch = target.port.match(/^(.*)__(left|right)$/);
        if (sourceMatch && targetMatch) {

          const sourceColumnId = sourceMatch[1];
          const targetColumnId = targetMatch[1];
          const sourceSide = sourceMatch[2];
          const targetSide = targetMatch[2];
          link.set('data', { ...link.get('data'), sourceColumnId, targetColumnId, sourceSide, targetSide });

          const targetEl = graph.getCell(target.id);
          const targetColumn = (targetEl?.get('data')?.columns || []).find((c) => c.id === targetColumnId);
          if (targetColumn) {
            onUpdateData(source.id, (data) => ({
              ...data,
              columns: (data.columns || []).map((c) =>
                c.id === sourceColumnId ? { ...c, type: targetColumn.type } : c
              ),
            }));
          }
        }
      }
      emitChange();
    });

    graph.on('remove', () => emitChange());

    function handleKeydown(evt) {

      if (evt.key !== 'Backspace' && evt.key !== 'Delete') return;
      const active = document.activeElement;
      if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable)) return;
      const selectedCell = getSelectedCell();
      if (!selectedCell) return;
      selectedCell.remove();
      clearSelectionSelectedRef();
      renderAllTables();

    }
    
    document.addEventListener('keydown', handleKeydown);

    return () => {
      teardownGlobalReroute();
      document.removeEventListener('keydown', handleKeydown);
      teardownDragAndPan();
      teardownZoom();
      teardownResizeObserver();

      teardownMinimap();

      paper.remove();
      if (paperEl.parentNode) paperEl.parentNode.removeChild(paperEl);
    };
  }, []);

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full" />

    <div className="absolute bottom-4 right-4 z-20 flex flex-col gap-1 glass-card p-1 !rounded-md">
      <button
        onClick={() => zoomActionsRef.current.zoomIn?.()}
        className="btn-secondary h-8 w-8 p-0 flex items-center justify-center !rounded-sm"
      >
        +
      </button>

      <button
        onClick={() => zoomActionsRef.current.zoomOut?.()}
        className="btn-secondary h-8 w-8 p-0 flex items-center justify-center !rounded-sm"
      >
        −
      </button>

      <button
        onClick={() => zoomActionsRef.current.fit?.()}
        className="btn-secondary h-8 w-8 p-0 flex items-center justify-center !rounded-sm"
        title="Fit to view"
      >
        ⤢
      </button>
    </div>

      <div
        ref={minimapContainerRef}
        className="absolute bottom-4 left-4 z-20 w-[220px] h-[124px] glass-card !rounded-md overflow-hidden"
      />
    </div>
  );
}
