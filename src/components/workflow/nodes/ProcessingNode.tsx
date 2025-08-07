import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RotateCcw, Palette, Camera, Shuffle, Play } from 'lucide-react';

interface ProcessingNodeProps {
  id: string;
  data: {
    label: string;
    processingType: 'reimagine' | 'reference' | 'rescene' | 'reangle' | 'remix';
  };
}

const getProcessingIcon = (type: string) => {
  switch (type) {
    case 'reimagine': return <RotateCcw className="w-3 h-3 text-white" />;
    case 'reference': return <Palette className="w-3 h-3 text-white" />;
    case 'rescene': return <Camera className="w-3 h-3 text-white" />;
    case 'reangle': return <RotateCcw className="w-3 h-3 text-white" />;
    case 'remix': return <Shuffle className="w-3 h-3 text-white" />;
    default: return <Play className="w-3 h-3 text-white" />;
  }
};

const getProcessingColor = (type: string) => {
  switch (type) {
    case 'reimagine': return 'from-indigo-500 to-purple-500';
    case 'reference': return 'from-pink-500 to-rose-500';
    case 'rescene': return 'from-emerald-500 to-teal-500';
    case 'reangle': return 'from-amber-500 to-orange-500';
    case 'remix': return 'from-violet-500 to-purple-500';
    default: return 'from-gray-500 to-gray-600';
  }
};

export const ProcessingNode = memo(({ id, data }: ProcessingNodeProps) => {
  return (
    <Card className="min-w-48 p-4 bg-ai-surface border-border shadow-card">
      <div className="flex items-center gap-2 mb-3">
        <div className={`p-1.5 rounded bg-gradient-to-br ${getProcessingColor(data.processingType)}`}>
          {getProcessingIcon(data.processingType)}
        </div>
        <h3 className="text-sm font-medium text-foreground">{data.label}</h3>
      </div>

      <div className="space-y-3">
        <Badge variant="secondary" className="text-xs">
          {data.processingType === 'reimagine' ? 'Image-to-Image' : 'Flux Kontext'}
        </Badge>
        
        <Button
          variant="ai"
          size="sm"
          className="w-full text-xs"
        >
          <Play className="w-3 h-3 mr-1" />
          Generate
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

ProcessingNode.displayName = 'ProcessingNode';