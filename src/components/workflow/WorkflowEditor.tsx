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
  MarkerType,
  BackgroundVariant,
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
import { FrameNode } from './nodes/FrameNode';
import { SectionNode } from './nodes/SectionNode';
import { ShapeNode } from './nodes/ShapeNode';
import { LeftSidebar } from './LeftSidebar';
import { RightSidebar } from './RightSidebar';
import { BottomToolbar } from './BottomToolbar';
import { TopToolbar } from './TopToolbar';
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
  frame: FrameNode,
  section: SectionNode,
  shape: ShapeNode,
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

// Custom edge styles - blue bezier edges
const defaultEdgeOptions = {
  type: 'default', // default is bezier
  markerEnd: {
    type: MarkerType.ArrowClosed,
    color: '#3b82f6', // blue-500
  },
  style: {
    stroke: '#3b82f6', // blue-500
    strokeWidth: 2,
  },
};

export const WorkflowEditor = () => {
  const { nodes, edges, selectedNodeId, setSelectedNodeId, setNodes, setEdges, updateNodeData } = useWorkflowStore();
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [pendingConnection, setPendingConnection] = useState<Connection | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeTool, setActiveTool] = useState<'cursor' | 'hand' | 'draw' | 'lasso'>('cursor');


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

  // Keyboard event handler for delete functionality and tool shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Tool shortcuts
      if (!event.metaKey && !event.ctrlKey) {
        if (event.key === 'v' || event.key === 'V') {
          setActiveTool('cursor');
          return;
        }
        if (event.key === 'h' || event.key === 'H') {
          setActiveTool('hand');
          return;
        }
        if (event.key === 'd' || event.key === 'D') {
          setActiveTool('draw');
          return;
        }
        if (event.key === 'l' || event.key === 'L') {
          setActiveTool('lasso');
          return;
        }
      }

      // Delete functionality
      if (event.key === 'Delete' || event.key === 'Backspace') {
        // Prevent default browser back navigation on Backspace
        if (event.key === 'Backspace' && !(event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement)) {
          event.preventDefault();
        }

        // Delete selected edge
        if (selectedEdgeId) {
          setEdges(edges.filter(edge => edge.id !== selectedEdgeId));
          setSelectedEdgeId(null);
        }
        // Delete selected node
        else if (selectedNodeId) {
          setNodes(nodes.filter(node => node.id !== selectedNodeId));
          setEdges(edges.filter(edge => edge.source !== selectedNodeId && edge.target !== selectedNodeId));
          setSelectedNodeId(null);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNodeId, selectedEdgeId, nodes, edges, setNodes, setEdges, setSelectedNodeId]);

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
        const newEdge = {
          ...params,
          id: `${params.source}-${params.target}`,
          ...defaultEdgeOptions,
        };
        setEdges([...edges, newEdge]);
      }
    },
    [edges, setEdges, nodes],
  );

  const onEdgeClick = useCallback((event: React.MouseEvent, edge: Edge) => {
    event.stopPropagation();
    setSelectedEdgeId(edge.id);
    setSelectedNodeId(null);
  }, [setSelectedNodeId]);

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    setSelectedNodeId(node.id);
    setSelectedEdgeId(null);
  }, [setSelectedNodeId]);

  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
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
      const newEdge = {
        ...pendingConnection,
        id: `${pendingConnection.source}-${pendingConnection.target}`,
        ...defaultEdgeOptions,
      };
      setEdges([...edges, newEdge]);

      setPendingConnection(null);
    }
    setDialogOpen(false);
  }, [pendingConnection, edges, setEdges, updateNodeData]);

  // Apply selected edge styling
  const edgesWithSelection = edges.map(edge => ({
    ...edge,
    style: {
      ...edge.style,
      stroke: edge.id === selectedEdgeId ? '#ffffff' : '#71717a',
      strokeWidth: edge.id === selectedEdgeId ? 3 : 2,
    },
    animated: edge.id === selectedEdgeId,
  }));

  return (
    <div className="h-screen flex bg-[#0a0a0a]">
      <LeftSidebar onAddNode={addNode} />

      <div className="flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edgesWithSelection}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onEdgeClick={onEdgeClick}
          onPaneClick={onPaneClick}
          nodeTypes={nodeTypes}
          defaultEdgeOptions={defaultEdgeOptions}
          fitView
          className="bg-[#0a0a0a]"
          style={{ backgroundColor: '#0a0a0a' }}
        >
          <Controls className="!bg-zinc-900 !border-zinc-800 !text-white [&_button]:!bg-zinc-800 [&_button:hover]:!bg-zinc-700 [&_button]:!border-zinc-700" />
          <MiniMap
            className="!bg-zinc-900 !border-2 !border-zinc-800"
            nodeColor="#1a1a1a"
            maskColor="rgba(0, 0, 0, 0.6)"
          />
          <Background
            color="#27272a"
            gap={16}
            size={1}
            variant={BackgroundVariant.Dots}
          />
        </ReactFlow>
      </div>

      <RightSidebar selectedNode={selectedNode} />

      {/* Bottom Toolbar - Interaction Tools */}
      <BottomToolbar
        activeTool={activeTool}
        onToolChange={setActiveTool}
      />

      {/* Top Toolbar - Resizable Nodes */}
      <TopToolbar
        onAddNode={addNode}
      />

      <ImageTypeSelectionDialog
        isOpen={dialogOpen}
        onOpenChange={setDialogOpen}
        onSelect={handleImageTypeSelect}
      />
    </div>
  );
};