import { create } from 'zustand';
import { Node, Edge } from '@xyflow/react';
import { RunwareService } from '@/services/RunwareService';
import { WorkflowExecutor } from '@/services/WorkflowExecutor';

interface WorkflowState {
  nodes: Node[];
  edges: Edge[];
  isGenerating: boolean;
  processedImages: Map<string, string>; // nodeId -> imageUrl
  selectedNodeId: string | null;
  runwareService: RunwareService | null;
  workflowExecutor: WorkflowExecutor | null;
  
  setNodes: (nodes: Node[]) => void;
  setEdges: (edges: Edge[]) => void;
  setIsGenerating: (generating: boolean) => void;
  setProcessedImage: (nodeId: string, imageUrl: string) => void;
  getProcessedImage: (nodeId: string) => string | undefined;
  setSelectedNodeId: (nodeId: string | null) => void;
  setRunwareService: (service: RunwareService) => void;
  executeWorkflow: (targetNodeId: string) => Promise<void>;
  updateNodeData: (nodeId: string, data: any) => void;
}

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  nodes: [],
  edges: [],
  isGenerating: false,
  processedImages: new Map(),
  selectedNodeId: null,
  runwareService: null,
  workflowExecutor: null,
  
  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),
  setIsGenerating: (isGenerating) => set({ isGenerating }),
  setSelectedNodeId: (selectedNodeId) => set({ selectedNodeId }),
  
  setProcessedImage: (nodeId, imageUrl) => set((state) => {
    const newMap = new Map(state.processedImages);
    newMap.set(nodeId, imageUrl);
    return { processedImages: newMap };
  }),
  
  getProcessedImage: (nodeId) => get().processedImages.get(nodeId),
  
  setRunwareService: (service) => set((state) => ({
    runwareService: service,
    workflowExecutor: new WorkflowExecutor(service)
  })),
  
  executeWorkflow: async (targetNodeId) => {
    const { workflowExecutor, nodes, edges, processedImages } = get();
    if (!workflowExecutor) return;
    
    set({ isGenerating: true });
    try {
      // Clear any cached results for this execution to ensure fresh generation
      workflowExecutor.clearProcessedImages();
      
      const result = await workflowExecutor.executeWorkflow(nodes, edges, targetNodeId);
      if (result) {
        // Update the target node with the result
        set((state) => ({
          nodes: state.nodes.map(node =>
            node.id === targetNodeId
              ? { ...node, data: { ...node.data, generatedImage: result } }
              : node
          )
        }));
      }
    } catch (error) {
      console.error('Workflow execution failed:', error);
    } finally {
      set({ isGenerating: false });
    }
  },
  
  updateNodeData: (nodeId, newData) => set((state) => ({
    nodes: state.nodes.map(node =>
      node.id === nodeId
        ? { ...node, data: { ...node.data, ...newData } }
        : node
    )
  })),
}));