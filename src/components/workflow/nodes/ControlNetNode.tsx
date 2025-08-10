import { memo, useEffect } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Zap, Users, Layers, Eye } from 'lucide-react';
import { useWorkflowStore } from '@/stores/workflowStore';

interface ControlNetNodeProps {
  id: string;
  data: {
    label: string;
    preprocessor: string;
  };
}

const getPreprocessorIcon = (preprocessor: string) => {
  switch (preprocessor) {
    case 'canny': return <Zap className="w-3 h-3 text-white" />;
    case 'depth': return <Layers className="w-3 h-3 text-white" />;
    case 'openpose': return <Users className="w-3 h-3 text-white" />;
    case 'normal': return <Eye className="w-3 h-3 text-white" />;
    default: return <Zap className="w-3 h-3 text-white" />;
  }
};

const getPreprocessorColor = (preprocessor: string) => {
  switch (preprocessor) {
    case 'canny': return 'from-purple-500 to-pink-500';
    case 'depth': return 'from-blue-500 to-cyan-500';
    case 'openpose': return 'from-green-500 to-emerald-500';
    case 'normal': return 'from-orange-500 to-yellow-500';
    default: return 'from-purple-500 to-pink-500';
  }
};

export const ControlNetNode = memo(({ id, data }: ControlNetNodeProps) => {
  const { edges, nodes, workflowExecutor, getProcessedImage } = useWorkflowStore();

  // Auto-preprocess when image input is connected
  useEffect(() => {
    const connectedImageInputs = edges.filter(edge => 
      edge.target === id && 
      nodes.find(n => n.id === edge.source)?.type === 'imageInput'
    );

    if (connectedImageInputs.length > 0 && workflowExecutor) {
      const sourceNodeId = connectedImageInputs[0].source;
      const existingPreprocessed = getProcessedImage(id);
      
      // Only preprocess if we don't already have a result for this node
      if (!existingPreprocessed) {
        const sourceImage = getProcessedImage(sourceNodeId);
        if (sourceImage) {
          // Trigger preprocessing automatically
          workflowExecutor.executeWorkflow(nodes, edges, id);
        }
      }
    }
  }, [edges, nodes, id, workflowExecutor, getProcessedImage]);

  return (
    <Card className="min-w-48 p-4 bg-ai-surface border-border shadow-card">
      <div className="flex items-center gap-2 mb-3">
        <div className={`p-1.5 rounded bg-gradient-to-br ${getPreprocessorColor(data.preprocessor)}`}>
          {getPreprocessorIcon(data.preprocessor)}
        </div>
        <h3 className="text-sm font-medium text-foreground">{data.label}</h3>
      </div>

      <div className="space-y-3">
        <Badge variant="secondary" className="text-xs">
          ControlNet Preprocessor
        </Badge>
        
        <Button
          variant="outline"
          size="sm"
          className="w-full text-xs"
        >
          <Zap className="w-3 h-3 mr-1" />
          Process Image
        </Button>
      </div>

      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-gray-400 !border-2 !border-white"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-green-500 !border-2 !border-white"
      />
    </Card>
  );
});

ControlNetNode.displayName = 'ControlNetNode';