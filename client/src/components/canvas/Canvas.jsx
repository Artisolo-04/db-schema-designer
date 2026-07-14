import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  applyNodeChanges,
} from '@xyflow/react';
import TableNode from './TableNode.jsx';
import { createDefaultTable } from '../../utils/schemaDefaults.js';
import { collidesWithAny, findFreePosition } from '../../utils/collision.js';

const nodeTypes = { tableNode: TableNode };

export default function Canvas({ initialNodes = [], onAddTableRef, onChange }) {
  const [nodes, setNodes] = useState(initialNodes);
  const isFirstRender = useRef(true);
  const isDragging = useRef(false);

  const onNodesChange = useCallback((changes) => {
    setNodes((nds) => {
      const safeChanges = changes.map((change) => {

        if (change.type !== 'position' || !change.position) return change;

        const draggedNode = nds.find((n) => n.id === change.id);
        if (!draggedNode) return change;

        const snappedPosition = change.position;

        const nextPosition = collidesWithAny(draggedNode, snappedPosition, nds)
          ? change.position
          : snappedPosition;

        if (!collidesWithAny(draggedNode, nextPosition, nds)) {
          return { ...change, position: nextPosition };
        }

        const slideX = { x: nextPosition.x, y: draggedNode.position.y };
        if (!collidesWithAny(draggedNode, slideX, nds)) {
          return { ...change, position: slideX };
        }

        const slideY = { x: draggedNode.position.x, y: nextPosition.y };
        if (!collidesWithAny(draggedNode, slideY, nds)) {
          return { ...change, position: slideY };
        }

        return { ...change, position: draggedNode.position };
      });

      return applyNodeChanges(safeChanges, nds);
    });
  }, []);

  const addTable = useCallback(() => {
    setNodes((nds) => {
      const position = findFreePosition(nds);
      const newTable = createDefaultTable(position);
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
    onChange?.(nodes, []);
  }, [nodes, onChange]);

  function handleNodeDragStart() {
    isDragging.current = true;
  }

  function handleNodeDragStop() {
    isDragging.current = false;
    onChange?.(nodes, []);
  }

  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        onNodesChange={onNodesChange}
        onNodeDragStart={handleNodeDragStart}
        onNodeDragStop={handleNodeDragStop}
        nodeTypes={nodeTypes}
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
    </div>
  );
}
