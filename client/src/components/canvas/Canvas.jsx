import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  MarkerType,
  ConnectionLineType,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
} from '@xyflow/react';
import TableNode from './TableNode.jsx';
import RelationshipEdge from './RelationshipEdge.jsx';
import { createDefaultTable } from '../../utils/schemaDefaults.js';
import { collidesWithAny, findFreePosition } from '../../utils/collision.js';

import { createContext, useContext } from 'react';

export const CanvasContext = createContext(null);
export function useCanvasContext() {
  return useContext(CanvasContext);
}

const nodeTypes = { tableNode: TableNode };
const edgeTypes = { relationshipEdge: RelationshipEdge };

function columnIdFromHandle(handleId) {
  if (!handleId) return handleId;
  return handleId.replace(/__(left|right)$/, '');
}

function relationshipKey(sourceColumnId, targetColumnId) {
  return [sourceColumnId, targetColumnId].sort().join('::');
}

function findNodeIdByColumnId(nodes, columnId) {
  const node = nodes.find((n) => (n.data?.columns || []).some((c) => c.id === columnId));
  return node?.id ?? null;
}

export default function Canvas({
  initialNodes = [],
  initialEdges = [],
  onAddTableRef,
  onChange,
}) {
  const [nodes, setNodes] = useState(initialNodes);
  const [edges, setEdges] = useState(initialEdges);
  const isFirstRender = useRef(true);
  const isDragging = useRef(false);

  useEffect(() => {
    const seen = new Map();
    const dupes = [];
    for (const edge of initialEdges) {
      const k = relationshipKey(edge.data?.sourceColumnId, edge.data?.targetColumnId);
      if (seen.has(k)) {
        dupes.push({ key: k, edgeIds: [seen.get(k), edge.id] });
      } else {
        seen.set(k, edge.id);
      }
    }
    if (dupes.length > 0) {
      console.warn(
        `[Canvas] Found ${dupes.length} duplicate relationship(s) already saved in this project:`,
        dupes
      );
    } else {
      console.info('[Canvas] No duplicate relationships found in saved edges.');
    }

  }, []);

  const onNodesChange = useCallback((changes) => {
    setNodes((nds) => {
      const safeChanges = changes.map((change) => {
        if (change.type !== 'position' || !change.position) return change;

        const draggedNode = nds.find((n) => n.id === change.id);
        if (!draggedNode) return change;

        if (!collidesWithAny(draggedNode, change.position, nds)) {
          return change;
        }

        const slideX = { x: change.position.x, y: draggedNode.position.y };
        if (!collidesWithAny(draggedNode, slideX, nds)) {
          return { ...change, position: slideX };
        }

        const slideY = { x: draggedNode.position.x, y: change.position.y };
        if (!collidesWithAny(draggedNode, slideY, nds)) {
          return { ...change, position: slideY };
        }

        return { ...change, position: draggedNode.position };
      });

      return applyNodeChanges(safeChanges, nds);
    });
  }, []);

  const onEdgesChange = useCallback((changes) => {
    setEdges((eds) => applyEdgeChanges(changes, eds));
  }, []);

  const onConnect = useCallback((params) => {
    const sourceColumnId = columnIdFromHandle(params.sourceHandle);
    const targetColumnId = columnIdFromHandle(params.targetHandle);
    const newKey = relationshipKey(sourceColumnId, targetColumnId);

    setEdges((eds) => {
      const alreadyExists = eds.some(
        (e) => relationshipKey(e.data?.sourceColumnId, e.data?.targetColumnId) === newKey
      );
      if (alreadyExists) {
        console.warn('[Canvas] Ignored duplicate connection attempt:', newKey);
        return eds;
      }
      return addEdge(
        {
          ...params,
          type: 'relationshipEdge',
          data: { sourceColumnId, targetColumnId },
        },
        eds
      );
    });
  }, []);

  const onCreateRelationship = useCallback((sourceColumnId, targetColumnId) => {
    const newKey = relationshipKey(sourceColumnId, targetColumnId);
    const sourceNodeId = findNodeIdByColumnId(nodes, sourceColumnId);
    const targetNodeId = findNodeIdByColumnId(nodes, targetColumnId);
    if (!sourceNodeId || !targetNodeId) return;

    setEdges((eds) => {
      const exists = eds.some(
        (e) => relationshipKey(e.data?.sourceColumnId, e.data?.targetColumnId) === newKey
      );
      if (exists) return eds;
      return addEdge(
        {
          id: `e-${sourceColumnId}-${targetColumnId}`,
          source: sourceNodeId,
          sourceHandle: `${sourceColumnId}__right`,
          target: targetNodeId,
          targetHandle: `${targetColumnId}__left`,
          type: 'relationshipEdge',
          data: { sourceColumnId, targetColumnId },
        },
        eds
      );
    });
  }, [nodes]);

  const addTable = useCallback(() => {
    setNodes((nds) => {
      const position = findFreePosition(nds);
      const newTable = createDefaultTable(position, nds);
      return [...nds, newTable];
    });
  }, []);

  if (onAddTableRef) onAddTableRef.current = addTable;

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (isDragging.current) return;
    onChange?.(nodes, edges);
  }, [nodes, edges, onChange]);

  function handleNodeDragStart() {
    isDragging.current = true;
  }

  function handleNodeDragStop() {
    isDragging.current = false;
    onChange?.(nodes, edges);
  }

  return (
    <div className="w-full h-full">
      <CanvasContext.Provider value={{ nodes, onCreateRelationship }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeDragStart={handleNodeDragStart}
          onNodeDragStop={handleNodeDragStop}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          connectionMode="loose"
          connectionLineType={ConnectionLineType.SmoothStep}
          connectionLineStyle={{ stroke: '#7c4df2', strokeWidth: 1.75 }}
          defaultEdgeOptions={{
            type: 'relationshipEdge',
            markerEnd: {
              type: MarkerType.Arrow,
              color: '#7c4df2',
              width: 10,
              height: 10,
            },
          }}
          snapToGrid={true}
          snapGrid={[20, 20]}
          fitView
          colorMode="dark"
          deleteKeyCode={['Backspace', 'Delete']}
        >
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#2c2c38" />
          <Controls />
          <MiniMap
            nodeColor="#7c4df2"
            maskColor="rgba(10, 10, 15, 0.7)"
            style={{ backgroundColor: '#121218' }}
          />
        </ReactFlow>
      </CanvasContext.Provider>

    </div>
  );
}
