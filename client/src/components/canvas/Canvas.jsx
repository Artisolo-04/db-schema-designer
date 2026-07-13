import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
} from '@xyflow/react';
import TableNode from './TableNode.jsx';
import AvoidEdge from './AvoidEdge.jsx';
import { createDefaultTable } from '../../utils/schemaDefaults.js';

const nodeTypes = { tableNode: TableNode };
const edgeTypes = { avoid: AvoidEdge };

export default function Canvas({ initialNodes = [], initialEdges = [], onAddTableRef, onChange }) {
  const [nodes, setNodes] = useState(initialNodes);
  const [edges, setEdges] = useState(initialEdges);
  const isFirstRender = useRef(true);
  const isDragging = useRef(false);

  const onNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );

  const onEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );

  const onConnect = useCallback(
    (connection) => setEdges((eds) => addEdge({ ...connection, animated: false }, eds)),
    []
  );

  const addTable = useCallback(() => {
    const position = {
      x: 80 + Math.random() * 300,
      y: 80 + Math.random() * 200,
    };
    const newTable = createDefaultTable(position);
    setNodes((nds) => [...nds, newTable]);
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
        snapToGrid={true}
        snapGrid={[20, 20]}
        fitView
        colorMode="dark"
        defaultEdgeOptions={{ type: 'avoid' }}
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
