import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Monitor, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface OutputNodeProps {
  id: string;
  data: {
    label: string;
    generatedImage?: string;
  };
}

export const OutputNode = memo(({ id, data }: OutputNodeProps) => {
  return (
    <Card className="min-w-64 p-4 bg-ai-surface border-border shadow-card">
      <div className="flex items-center gap-2 mb-3">
        <div className="p-1.5 rounded bg-gradient-to-br from-emerald-500 to-green-500">
          <Monitor className="w-3 h-3 text-white" />
        </div>
        <h3 className="text-sm font-medium text-foreground">{data.label}</h3>
      </div>

      <div className="space-y-3">
        <Badge variant="secondary" className="text-xs">
          Final Output
        </Badge>

        {data.generatedImage ? (
          <div className="space-y-2">
            <img 
              src={data.generatedImage} 
              alt="Generated output" 
              className="w-full h-32 object-cover rounded-lg border border-border"
            />
            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs"
            >
              <Download className="w-3 h-3 mr-1" />
              Download
            </Button>
          </div>
        ) : (
          <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
            <Monitor className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">
              Output will appear here
            </p>
          </div>
        )}
      </div>

      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-gray-400 !border-2 !border-white"
      />
    </Card>
  );
});

OutputNode.displayName = 'OutputNode';