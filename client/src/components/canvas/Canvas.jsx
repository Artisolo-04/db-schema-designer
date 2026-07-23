import { useEffect, useRef } from 'react';
import { dia } from '@joint/core';
import { Table, Relationship, buildPortItems, computeTableHeight, TABLE_WIDTH, setSelected, manhattanRouter, applyRelationshipVisuals } from './joint/shapes.js';
import TableElementView from './joint/TableElementView.jsx';
import { createDefaultTable, createDefaultColumn, generateId } from '../../utils/schemaDefaults.js';
import { collidesWithAny, findFreePosition, rectFromPosition } from '../../utils/collision.js';
import { setupMinimap } from './hooks/setupMinimap.js';
import { setupZoom } from './hooks/setupZoom.js';
import { setupSelection } from './hooks/setupSelection.js';
import { setupDragAndPan } from './hooks/setupDragAndPan.js';
import { setupResizeObserver } from './hooks/setupResizeObserver.js';
import { loadInitialGraph } from './hooks/loadInitialGraph.js';
import { setupGlobalReroute } from './hooks/setupGlobalReroute.js';
import { createGraphAndPaper } from './hooks/createGraphAndPaper.js';
import { resolveGrowthCollision } from './hooks/resolveGrowthCollision.js';

function relationshipKey(sourceColumnId, targetColumnId) {
  return [sourceColumnId, targetColumnId].sort().join('::');
}

const LOOP_MARGIN = 60;

function getPortPosition(el, portId) {
  const ports = el.get('ports')?.items || [];
  const port = ports.find((p) => p.id === portId);
  if (!port) return null;
  const bbox = el.getBBox();
  return { x: bbox.x + (port.args?.x ?? 0), y: bbox.y + (port.args?.y ?? 0) };
}

const namespace = { app: { Table, Relationship, TableView: TableElementView } };

export default function Canvas({ initialNodes = [], initialEdges = [], onAddTableRef, onChange, onEdgeSelect, relationshipApiRef, openEdgeId }) {
  const containerRef = useRef(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const onEdgeSelectRef = useRef(onEdgeSelect);
  onEdgeSelectRef.current = onEdgeSelect;
  const openEdgeIdRef = useRef(openEdgeId);
  openEdgeIdRef.current = openEdgeId;
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

      resolveGrowthCollision({
        el,
        otherRects: otherRects(el.id),
        gridSize: GRID_SIZE,
        onComplete: emitChange,
      });
    }

    function applySelfLoopRouting(link) {
      const source = link.get('source');
      const target = link.get('target');
      if (!source?.id || !target?.id || source.id !== target.id) return;
      const el = graph.getCell(source.id);
      if (!el) return;
      const sourcePos = getPortPosition(el, source.port);
      const targetPos = getPortPosition(el, target.port);
      if (!sourcePos || !targetPos) return;
      const bbox = el.getBBox();
      const rightX = bbox.x + bbox.width + LOOP_MARGIN;
      const bottomY = bbox.y + bbox.height + LOOP_MARGIN;
      const leftX = bbox.x - LOOP_MARGIN;
      link.set('router', { name: 'normal' });
      link.set('connector', { name: 'rounded', args: { radius: 12 } });
      link.set('vertices', [
        { x: rightX, y: sourcePos.y },
        { x: rightX, y: bottomY },
        { x: leftX, y: bottomY },
        { x: leftX, y: targetPos.y },
      ]);
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

      const openLinkId = openEdgeIdRef.current;
      if (openLinkId) {
        const openLink = graph.getCell(openLinkId);
        if (openLink && openLink.isLink && openLink.isLink()) {
          const openSource = openLink.get('source');
          const openTarget = openLink.get('target');
          if (openSource?.id === id || openTarget?.id === id) {
            onEdgeSelectRef.current?.(buildEdgeDescriptor(openLink));
          }
        }
      }

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

      if (sourceColumnId === targetColumnId) return;

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
        data: { sourceColumnId, targetColumnId, sourceSide: 'right', targetSide: 'left', relationshipType: 'one-to-many', onDelete: 'CASCADE', onUpdate: 'CASCADE' },
      });

      newLink.addTo(graph);
      applyRelationshipVisuals(newLink);
      applySelfLoopRouting(newLink);
      emitChange();
    }

    function buildEdgeDescriptor(link) {
      const data = link.get('data') || {};
      const sourceEl = graph.getCell(link.get('source')?.id);
      const targetEl = graph.getCell(link.get('target')?.id);
      const sourceColumn = (sourceEl?.get('data')?.columns || []).find((c) => c.id === data.sourceColumnId);
      const targetColumn = (targetEl?.get('data')?.columns || []).find((c) => c.id === data.targetColumnId);
      return {
        linkId: link.id,
        sourceTableName: sourceEl?.get('data')?.name || 'table',
        sourceColumnId: data.sourceColumnId,
        sourceColumnName: sourceColumn?.name || data.sourceColumnId,
        sourceTableColumns: (sourceEl?.get('data')?.columns || []).map((c) => ({ id: c.id, name: c.name })),
        targetTableName: targetEl?.get('data')?.name || 'table',
        targetColumnId: data.targetColumnId,
        targetColumnName: targetColumn?.name || data.targetColumnId,
        targetTableColumns: (targetEl?.get('data')?.columns || []).map((c) => ({ id: c.id, name: c.name })),
        sourceColumnType: sourceColumn?.type || null,
        targetColumnType: targetColumn?.type || null,
        sourceIsNotNull: !!sourceColumn?.isNotNull,
        targetIsNotNull: !!targetColumn?.isNotNull,
        sourceIsReferenceable: !!(sourceColumn?.isPrimaryKey || sourceColumn?.isUnique),
        targetIsReferenceable: !!(targetColumn?.isPrimaryKey || targetColumn?.isUnique),
        relationshipType: data.relationshipType || 'one-to-many',
        onDelete: data.onDelete || 'CASCADE',
        onUpdate: data.onUpdate || 'CASCADE',
      };
    }

    function updateRelationship(linkId, patch) {
      const link = graph.getCell(linkId);
      if (!link) return;
      link.set('data', { ...link.get('data'), ...patch });
      applyRelationshipVisuals(link);
      emitChange();
      onEdgeSelectRef.current?.(buildEdgeDescriptor(link));
    }

    function deleteRelationship(linkId) {
      graph.getCell(linkId)?.remove();
      onEdgeSelectRef.current?.(null);
    }

    function changeRelationshipColumn(linkId, side, newColumnId) {
      const link = graph.getCell(linkId);
      if (!link) return;
      const endpoint = side === 'source' ? link.get('source') : link.get('target');
      if (!endpoint?.id) return;
      const newPort = side === 'source' ? `${newColumnId}__right` : `${newColumnId}__left`;
      link.set(side, { id: endpoint.id, port: newPort });
      syncLinkTypeAndData(link);
      onEdgeSelectRef.current?.(buildEdgeDescriptor(link));
    }

    function convertToManyToMany(linkId) {
      const link = graph.getCell(linkId);
      if (!link) return;
      const sourceEl = graph.getCell(link.get('source')?.id);
      const targetEl = graph.getCell(link.get('target')?.id);
      if (!sourceEl || !targetEl) return;

      const sourceData = sourceEl.get('data') || {};
      const targetData = targetEl.get('data') || {};
      const sourceCols = sourceData.columns || [];
      const targetCols = targetData.columns || [];
      const sourcePk = sourceCols.find((c) => c.isPrimaryKey) || sourceCols[0];
      const targetPk = targetCols.find((c) => c.isPrimaryKey) || targetCols[0];
      if (!sourcePk || !targetPk) return;

      link.remove();

      const existingNames = new Set(graph.getElements().map((el) => el.get('data')?.name));
      let junctionName = `${sourceData.name}_${targetData.name}`;
      let n = 2;
      while (existingNames.has(junctionName)) {
        junctionName = `${sourceData.name}_${targetData.name}_${n}`;
        n += 1;
      }

      let fk1Name = `${sourceData.name}_id`;
      let fk2Name = `${targetData.name}_id`;
      if (fk1Name === fk2Name) fk2Name = `${targetData.name}_id_2`;

      const fk1 = createDefaultColumn({ name: fk1Name, type: sourcePk.type, isPrimaryKey: true, isNotNull: true });
      const fk2 = createDefaultColumn({ name: fk2Name, type: targetPk.type, isPrimaryKey: true, isNotNull: true });

      const srcPos = sourceEl.position();
      const tgtPos = targetEl.position();
      let position = {
        x: Math.round((srcPos.x + tgtPos.x) / 2 / GRID_SIZE) * GRID_SIZE,
        y: Math.round((Math.max(srcPos.y, tgtPos.y) + 240) / GRID_SIZE) * GRID_SIZE,
      };
      const junctionRects = otherRects('**none**');
      while (collidesWithAny(rectFromPosition(position, { width: TABLE_WIDTH, height: computeTableHeight(2) }), junctionRects)) {
        position = { x: position.x, y: position.y + GRID_SIZE * 4 };
      }

      const junctionEl = new Table({
        id: generateId('table'),
        position,
        data: { name: junctionName, columns: [fk1, fk2] },
      });
      resizeForColumns(junctionEl);
      junctionEl.addTo(graph);

      function linkJunctionTo(parentEl, fkColumn, parentColumn) {
        const sourcePort = `${fkColumn.id}__right`;
        const targetPort = `${parentColumn.id}__left`;
        const newLink = new Relationship({
          source: { id: junctionEl.id, port: sourcePort },
          target: { id: parentEl.id, port: targetPort },
          router: manhattanRouter(sourcePort, targetPort),
          data: {
            sourceColumnId: fkColumn.id,
            targetColumnId: parentColumn.id,
            sourceSide: 'right',
            targetSide: 'left',
            relationshipType: 'one-to-many',
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
          },
        });
        newLink.addTo(graph);
        applyRelationshipVisuals(newLink);
      }

      linkJunctionTo(sourceEl, fk1, sourcePk);
      linkJunctionTo(targetEl, fk2, targetPk);

      renderAllTables();
      emitChange();
      onEdgeSelectRef.current?.(null);
    }

    function swapRelationshipEndpoints(linkId) {
      const link = graph.getCell(linkId);
      if (!link) return;
      const source = link.get('source');
      const target = link.get('target');
      if (!source?.id || !target?.id) return;
      link.set('source', target);
      link.set('target', source);
      syncLinkTypeAndData(link);
      applyRelationshipVisuals(link);
      onEdgeSelectRef.current?.(buildEdgeDescriptor(link));
    }

    if (relationshipApiRef) {
      relationshipApiRef.current = { updateRelationship, deleteRelationship, changeRelationshipColumn, convertToManyToMany, swapRelationshipEndpoints };
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
    graph.getLinks().forEach((link) => applyRelationshipVisuals(link));
    renderAllTables();
    zoomToFit();

    const { teardownGlobalReroute } = setupGlobalReroute({ graph, paper });
    const { getSelectedCell, clearSelectionSelectedRef } = setupSelection({
      graph, paper, setSelected, blurActiveInput,
      onSelectionChange: (cell) => {
        if (cell?.isLink()) {
          onEdgeSelectRef.current?.(buildEdgeDescriptor(cell));
        }
      },
    });
    const { teardownDragAndPan } = setupDragAndPan({ graph, paper, container, GRID_SIZE, otherRects, emitChange, blurActiveInput });

    let highlightedPortNode = null;
    function clearPortHighlight() {
      if (highlightedPortNode) {
        highlightedPortNode.classList.remove('port-snap-active');
        highlightedPortNode = null;
      }
    }
    function setPortHighlight(node) {
      if (highlightedPortNode === node) return;
      clearPortHighlight();
      if (node) {
        node.classList.add('port-snap-active');
        highlightedPortNode = node;
      }
    }

    const SNAP_MARGIN = 30;
    paper.on('link:pointermove', (linkView, evt, x, y) => {
      const link = linkView.model;
      const sourceId = link.get('source')?.id;
      const sourcePortRaw = link.get('source')?.port;
      const sourceColumnId = sourcePortRaw?.replace(/__(left|right)$/, '');

      let closestModel = null;
      let closestModelDist = Infinity;
      graph.getElements().forEach((model) => {
        if (model.get('type') !== 'app.Table') return;
        const bbox = model.getBBox().inflate(SNAP_MARGIN);
        if (!bbox.containsPoint({ x, y })) return;
        const cx = bbox.x + bbox.width / 2;
        const cy = bbox.y + bbox.height / 2;
        const dist = Math.hypot(cx - x, cy - y);
        if (dist < closestModelDist) {
          closestModelDist = dist;
          closestModel = model;
        }
      });

      if (closestModel) {
        const ports = closestModel.get('ports')?.items || [];
        if (ports.length) {
          const bbox = closestModel.getBBox();
          let closest = null;
          let closestDist = Infinity;
          ports.forEach((port) => {
            const portColumnId = port.id?.replace(/__(left|right)$/, '');
            if (sourceColumnId && portColumnId === sourceColumnId) return;
            const px = bbox.x + (port.args?.x ?? 0);
            const py = bbox.y + (port.args?.y ?? 0);
            const dist = Math.hypot(px - x, py - y);
            if (dist < closestDist) {
              closestDist = dist;
              closest = port;
            }
          });
          if (closest) {
            const targetView = paper.findViewByModel(closestModel);
            const portNode = targetView?.findPortNode(closest.id, 'portBody');
            setPortHighlight(portNode || null);
            link.set('target', { id: closestModel.id, port: closest.id });
            linkView.el.style.removeProperty('opacity');
            return;
          }
        }
        if (closestModel.id === sourceId) {
          linkView.el.style.opacity = '0';
          clearPortHighlight();
          link.set('target', { x, y });
          return;
        }
      }
      clearPortHighlight();
      link.set('target', { x, y });
      linkView.el.style.removeProperty('opacity');
    });
    function syncLinkTypeAndData(link) {
      const source = link.get('source');
      const target = link.get('target');
      if (!source?.port || !target?.port) return;
      const sourceMatch = source.port.match(/^(.*)__(left|right)$/);
      const targetMatch = target.port.match(/^(.*)__(left|right)$/);
      if (!sourceMatch || !targetMatch) return;
      const sourceColumnId = sourceMatch[1];
      const targetColumnId = targetMatch[1];
      const sourceSide = sourceMatch[2];
      const targetSide = targetMatch[2];
      const existingLinkData = link.get('data') || {};
      link.set('data', {
        ...existingLinkData,
        sourceColumnId,
        targetColumnId,
        sourceSide,
        targetSide,
        relationshipType: existingLinkData.relationshipType || 'one-to-many',
        onDelete: existingLinkData.onDelete || 'CASCADE',
        onUpdate: existingLinkData.onUpdate || 'CASCADE',
      });
      applyRelationshipVisuals(link);
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
      emitChange();
    }
    paper.on('link:pointerup', (linkView) => {
      linkView.el.style.removeProperty('opacity');
      clearPortHighlight();
      const link = linkView.model;
      const target = link.get('target');
      if (target?.id && target?.port) {
        const source = link.get('source');
        const sourceColumnId = source?.port?.replace(/__(left|right)$/, '');
        const targetColumnId = target?.port?.replace(/__(left|right)$/, '');
        if (!sourceColumnId || !targetColumnId || sourceColumnId === targetColumnId) {

          link.remove();
          return;
        }
        const key = [sourceColumnId, targetColumnId].sort().join('::');
        const duplicateLink = graph.getLinks().find((l) => {
          if (l.id === link.id) return false;
          const d = l.get('data');
          if (!d?.sourceColumnId || !d?.targetColumnId) return false;
          return [d.sourceColumnId, d.targetColumnId].sort().join('::') === key;
        });
        if (duplicateLink) {
          const duplicateLinkView = paper.findViewByModel(duplicateLink);
          const lineNode = duplicateLinkView?.el?.querySelector('[joint-selector="line"]');
          if (lineNode) {
            lineNode.classList.add('edge-duplicate-warning');
            setTimeout(() => {
              lineNode.classList.remove('edge-duplicate-warning');
            }, 500);
          }
          link.remove();
          return;
        }
        syncLinkTypeAndData(link);
      }
    });
    paper.on('link:connect', clearPortHighlight);
    paper.on('link:connect', (linkView) => {
      linkView.el.style.removeProperty('opacity');
      syncLinkTypeAndData(linkView.model);
      emitChange();
    });

    graph.on('remove', () => emitChange());

    function handleKeydown(evt) {

      if (evt.key !== 'Backspace' && evt.key !== 'Delete') return;
      const active = document.activeElement;
      if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable)) return;
      const selectedCell = getSelectedCell();
      if (!selectedCell) return;
      const wasLink = selectedCell.isLink();
      selectedCell.remove();
      clearSelectionSelectedRef();
      renderAllTables();
      if (wasLink) onEdgeSelectRef.current?.(null);
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
