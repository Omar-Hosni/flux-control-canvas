import { useCallback, useState } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  NodeTypes,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

// Node components
import { TextInputNode } from './nodes/TextInputNode';
import { ImageInputNode } from './nodes/ImageInputNode';
import { ControlNetNode } from './nodes/ControlNetNode';
import { ProcessingNode } from './nodes/ProcessingNode';
import { ToolNode } from './nodes/ToolNode';
import { OutputNode } from './nodes/OutputNode';
import { WorkflowToolbar } from './WorkflowToolbar';
import { useWorkflowStore } from '../../stores/workflowStore';

// Define node types
const nodeTypes: NodeTypes = {
  textInput: TextInputNode,
  imageInput: ImageInputNode,
  controlNet: ControlNetNode,
  processing: ProcessingNode,
  tool: ToolNode,
  output: OutputNode,
};

const initialNodes: Node[] = [
  {
    id: 'output-1',
    type: 'output',
    position: { x: 800, y: 200 },
    data: { label: 'Output' },
  },
];

const initialEdges: Edge[] = [];

export const WorkflowEditor = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const { isGenerating } = useWorkflowStore();

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges],
  );

  const addNode = useCallback((type: string, nodeData: any) => {
    const newNode: Node = {
      id: `${type}-${Date.now()}`,
      type,
      position: { x: Math.random() * 300, y: Math.random() * 300 },
      data: nodeData,
    };
    setNodes((nds) => [...nds, newNode]);
  }, [setNodes]);

  return (
    <div className="h-screen flex flex-col bg-background">
      <WorkflowToolbar onAddNode={addNode} />
      
      <div className="flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
          className="bg-ai-surface"
          style={{ backgroundColor: 'hsl(var(--ai-surface))' }}
        >
          <Controls className="!bg-ai-surface !border-border" />
          <MiniMap className="!bg-ai-surface !border-border" />
          <Background 
            color="hsl(var(--border))" 
            gap={20} 
            size={1}
          />
        </ReactFlow>
      </div>
    </div>
  );
};