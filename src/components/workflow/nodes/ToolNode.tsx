import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eraser, ArrowUp, PaintBucket, Crop, Play } from 'lucide-react';

interface ToolNodeProps {
  id: string;
  data: {
    label: string;
    toolType: 'removebg' | 'upscale' | 'inpaint' | 'outpaint';
  };
}

const getToolIcon = (type: string) => {
  switch (type) {
    case 'removebg': return <Eraser className="w-3 h-3 text-white" />;
    case 'upscale': return <ArrowUp className="w-3 h-3 text-white" />;
    case 'inpaint': return <PaintBucket className="w-3 h-3 text-white" />;
    case 'outpaint': return <Crop className="w-3 h-3 text-white" />;
    default: return <Play className="w-3 h-3 text-white" />;
  }
};

const getToolColor = (type: string) => {
  switch (type) {
    case 'removebg': return 'from-red-500 to-pink-500';
    case 'upscale': return 'from-blue-500 to-indigo-500';
    case 'inpaint': return 'from-green-500 to-emerald-500';
    case 'outpaint': return 'from-yellow-500 to-orange-500';
    default: return 'from-gray-500 to-gray-600';
  }
};

export const ToolNode = memo(({ id, data }: ToolNodeProps) => {
  return (
    <Card className="min-w-48 p-4 bg-ai-surface border-border shadow-card">
      <div className="flex items-center gap-2 mb-3">
        <div className={`p-1.5 rounded bg-gradient-to-br ${getToolColor(data.toolType)}`}>
          {getToolIcon(data.toolType)}
        </div>
        <h3 className="text-sm font-medium text-foreground">{data.label}</h3>
      </div>

      <div className="space-y-3">
        <Badge variant="secondary" className="text-xs">
          Image Tool
        </Badge>
        
        <Button
          variant="outline"
          size="sm"
          className="w-full text-xs"
        >
          <Play className="w-3 h-3 mr-1" />
          Process
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

ToolNode.displayName = 'ToolNode';