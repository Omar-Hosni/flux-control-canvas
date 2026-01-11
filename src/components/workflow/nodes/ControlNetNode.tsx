import { memo, useEffect } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Zap, Users, Layers, Eye, Grid3x3 } from 'lucide-react';
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
    case 'normalbae': return <Eye className="w-3 h-3 text-white" />;
    case 'seg': return <Grid3x3 className="w-3 h-3 text-white" />;
    default: return <Zap className="w-3 h-3 text-white" />;
  }
};

const getPreprocessorColor = (preprocessor: string) => {
  switch (preprocessor) {
    case 'canny': return 'from-zinc-700 to-zinc-900';
    case 'depth': return 'from-zinc-800 to-black';
    case 'openpose': return 'from-zinc-600 to-zinc-800';
    case 'normalbae': return 'from-black to-zinc-800';
    case 'seg': return 'from-zinc-900 to-black';
    default: return 'from-zinc-800 to-zinc-900';
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
      const existingPreprocessed = getProcessedImage(id);
      // Only preprocess if we don't already have a result for this node
      if (!existingPreprocessed) {
        // Trigger preprocessing automatically; image input will be handled by executor
        workflowExecutor.executeWorkflow(nodes, edges, id);
      }
    }
  }, [edges, nodes, id, workflowExecutor, getProcessedImage]);

  return (
    <Card className="min-w-48 p-4 bg-[#1a1a1a] border-2 border-zinc-800 hover:border-zinc-700 shadow-xl hover:shadow-2xl transition-all duration-200">
      <div className="flex items-center gap-2 mb-3">
        <div className={`p-1.5 rounded bg-gradient-to-br ${getPreprocessorColor(data.preprocessor)} border border-zinc-700`}>
          {getPreprocessorIcon(data.preprocessor)}
        </div>
        <h3 className="text-sm font-medium text-white">{data.label}</h3>
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
        className="!w-3 !h-3 !bg-zinc-400 !border-2 !border-zinc-900 hover:!scale-125 transition-transform"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-white !border-2 !border-zinc-900 hover:!scale-125 transition-transform"
      />
    </Card>
  );
});

ControlNetNode.displayName = 'ControlNetNode';