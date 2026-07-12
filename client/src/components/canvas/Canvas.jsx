import { useCallback, useState } from 'react';
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
import { createDefaultTable } from '../../utils/schemaDefaults.js';

const nodeTypes = { tableNode: TableNode };

export default function Canvas({ initialNodes = [], initialEdges = [], onAddTableRef }) {
  const [nodes, setNodes] = useState(initialNodes);
  const [edges, setEdges] = useState(initialEdges);

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

  // Expose addTable to parent via ref callback
  if (onAddTableRef) onAddTableRef.current = addTable;

  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
        colorMode="dark"
        defaultEdgeOptions={{ type: 'smoothstep' }}
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
