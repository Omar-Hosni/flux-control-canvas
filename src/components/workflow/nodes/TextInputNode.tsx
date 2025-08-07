import { memo, useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Type } from 'lucide-react';

interface TextInputNodeProps {
  id: string;
  data: {
    label: string;
    prompt: string;
  };
}

export const TextInputNode = memo(({ id, data }: TextInputNodeProps) => {
  const [prompt, setPrompt] = useState(data.prompt || '');

  return (
    <Card className="min-w-64 p-4 bg-ai-surface border-border shadow-card">
      <div className="flex items-center gap-2 mb-3">
        <div className="p-1.5 rounded bg-gradient-to-br from-purple-500 to-pink-500">
          <Type className="w-3 h-3 text-white" />
        </div>
        <h3 className="text-sm font-medium text-foreground">{data.label}</h3>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor={`prompt-${id}`} className="text-xs text-muted-foreground">
          Text Prompt
        </Label>
        <Textarea
          id={`prompt-${id}`}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Enter your prompt..."
          className="min-h-20 text-sm nodrag"
          rows={3}
        />
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-purple-500 !border-2 !border-white"
      />
    </Card>
  );
});

TextInputNode.displayName = 'TextInputNode';