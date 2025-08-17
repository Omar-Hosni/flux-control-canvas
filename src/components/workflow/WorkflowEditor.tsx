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
import { LeftSidebar } from './LeftSidebar';
import { RightSidebar } from './RightSidebar';
import { ImageTypeSelectionDialog } from './ImageTypeSelectionDialog';
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
  const { nodes, edges, selectedNodeId, setSelectedNodeId, setNodes, setEdges, updateNodeData } = useWorkflowStore();
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [pendingConnection, setPendingConnection] = useState<Connection | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Initialize with default nodes if empty
  useEffect(() => {
    if (nodes.length === 0) {
      setNodes(initialNodes);
    }
  }, [nodes.length, setNodes]);

  // Update selected node when selectedNodeId changes
  useEffect(() => {
    if (selectedNodeId) {
      const node = nodes.find(n => n.id === selectedNodeId);
      setSelectedNode(node || null);
    } else {
      setSelectedNode(null);
    }
  }, [selectedNodeId, nodes]);

  const onNodesChange = useCallback((changes: any) => {
    setNodes(applyNodeChanges(changes, nodes));
  }, [nodes, setNodes]);

  const onEdgesChange = useCallback((changes: any) => {
    setEdges(applyEdgeChanges(changes, edges));
  }, [edges, setEdges]);

  const onConnect = useCallback(
    (params: Connection) => {
      // Check if connecting an imageInput node to a rerendering node of type 'rescene'
      const sourceNode = nodes.find(n => n.id === params.source);
      const targetNode = nodes.find(n => n.id === params.target);
      
      if (sourceNode?.type === 'imageInput' && 
          targetNode?.type === 'rerendering' && 
          targetNode.data.rerenderingType === 'rescene') {
        setPendingConnection(params);
        setDialogOpen(true);
      } else {
        setEdges([...edges, { ...params, id: `${params.source}-${params.target}` }]);
      }
    },
    [edges, setEdges, nodes],
  );

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    setSelectedNodeId(node.id);
  }, [setSelectedNodeId]);

  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null);
  }, [setSelectedNodeId]);

  const addNode = useCallback((type: string, nodeData: any) => {
    const newNode: Node = {
      id: `${type}-${Date.now()}`,
      type,
      position: { x: Math.random() * 300, y: Math.random() * 300 },
      data: nodeData,
    };
    setNodes([...nodes, newNode]);
  }, [nodes, setNodes]);

  const handleImageTypeSelect = useCallback((type: 'object' | 'scene' | 'fuse') => {
    if (pendingConnection) {
      // Update the source image node with the selected type
      updateNodeData(pendingConnection.source!, { imageType: type });
      
      // Create the edge
      setEdges([...edges, { 
        ...pendingConnection, 
        id: `${pendingConnection.source}-${pendingConnection.target}` 
      }]);
      
      setPendingConnection(null);
    }
    setDialogOpen(false);
  }, [pendingConnection, edges, setEdges, updateNodeData]);

  return (
    <div className="h-screen flex bg-background">
      <LeftSidebar onAddNode={addNode} />
      
      <div className="flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
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

      <RightSidebar selectedNode={selectedNode} />
      
      <ImageTypeSelectionDialog
        isOpen={dialogOpen}
        onOpenChange={setDialogOpen}
        onSelect={handleImageTypeSelect}
      />
    </div>
  );
};