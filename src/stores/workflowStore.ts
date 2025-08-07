import { create } from 'zustand';
import { Node, Edge } from '@xyflow/react';

interface WorkflowState {
  nodes: Node[];
  edges: Edge[];
  isGenerating: boolean;
  processedImages: Map<string, string>; // nodeId -> imageUrl
  setNodes: (nodes: Node[]) => void;
  setEdges: (edges: Edge[]) => void;
  setIsGenerating: (generating: boolean) => void;
  setProcessedImage: (nodeId: string, imageUrl: string) => void;
  getProcessedImage: (nodeId: string) => string | undefined;
}

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  nodes: [],
  edges: [],
  isGenerating: false,
  processedImages: new Map(),
  
  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),
  setIsGenerating: (isGenerating) => set({ isGenerating }),
  
  setProcessedImage: (nodeId, imageUrl) => set((state) => {
    const newMap = new Map(state.processedImages);
    newMap.set(nodeId, imageUrl);
    return { processedImages: newMap };
  }),
  
  getProcessedImage: (nodeId) => get().processedImages.get(nodeId),
}));