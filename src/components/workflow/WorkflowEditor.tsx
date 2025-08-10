import { useCallback, useState, useEffect } from 'react';
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
  applyNodeChanges,
  applyEdgeChanges,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

// Node components
import { TextInputNode } from './nodes/TextInputNode';
import { ImageInputNode } from './nodes/ImageInputNode';
import { ControlNetNode } from './nodes/ControlNetNode';
import { RerenderingNode } from './nodes/RerenderingNode';
import { ToolNode } from './nodes/ToolNode';
import { EngineNode } from './nodes/EngineNode';
import { GearNode } from './nodes/GearNode';
import { OutputNode } from './nodes/OutputNode';
import { WorkflowToolbar } from './WorkflowToolbar';
import { useWorkflowStore } from '../../stores/workflowStore';

// Define node types
const nodeTypes: NodeTypes = {
  textInput: TextInputNode,
  imageInput: ImageInputNode,
  controlNet: ControlNetNode,
  rerendering: RerenderingNode,
  tool: ToolNode,
  engine: EngineNode,
  gear: GearNode,
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
  const { nodes, edges, isGenerating, setNodes, setEdges } = useWorkflowStore();

  // Initialize with default nodes if empty
  useEffect(() => {
    if (nodes.length === 0) {
      setNodes(initialNodes);
    }
  }, [nodes.length, setNodes]);

  const onNodesChange = useCallback((changes: any) => {
    setNodes(applyNodeChanges(changes, nodes));
  }, [nodes, setNodes]);

  const onEdgesChange = useCallback((changes: any) => {
    setEdges(applyEdgeChanges(changes, edges));
  }, [edges, setEdges]);

  const onConnect = useCallback(
    (params: Connection) => setEdges([...edges, { ...params, id: `${params.source}-${params.target}` }]),
    [edges, setEdges],
  );

  const addNode = useCallback((type: string, nodeData: any) => {
    const newNode: Node = {
      id: `${type}-${Date.now()}`,
      type,
      position: { x: Math.random() * 300, y: Math.random() * 300 },
      data: nodeData,
    };
    setNodes([...nodes, newNode]);
  }, [nodes, setNodes]);

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