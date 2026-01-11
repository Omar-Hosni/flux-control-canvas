import { memo, useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Type } from 'lucide-react';
import { useWorkflowStore } from '@/stores/workflowStore';

interface TextInputNodeProps {
  id: string;
  data: {
    label: string;
    prompt: string;
  };
}

export const TextInputNode = memo(({ id, data }: TextInputNodeProps) => {
  const [prompt, setPrompt] = useState(data.prompt || '');
  const { updateNodeData } = useWorkflowStore();

  const handlePromptChange = (value: string) => {
    setPrompt(value);
    updateNodeData(id, { prompt: value });
  };

  return (
    <Card className="min-w-64 p-4 bg-[#1a1a1a] border-2 border-zinc-800 hover:border-zinc-700 shadow-xl hover:shadow-2xl transition-all duration-200">
      <div className="flex items-center gap-2 mb-3">
        <div className="p-1.5 rounded bg-gradient-to-br from-zinc-900 to-black border border-zinc-700">
          <Type className="w-3 h-3 text-white" />
        </div>
        <h3 className="text-sm font-medium text-white">{data.label}</h3>
      </div>

      <div className="space-y-2">
        <Label htmlFor={`prompt-${id}`} className="text-xs text-zinc-400">
          Positive Prompt
        </Label>
        <Textarea
          id={`prompt-${id}`}
          value={prompt}
          onChange={(e) => handlePromptChange(e.target.value)}
          placeholder="Enter your positive prompt..."
          className="min-h-20 text-sm nodrag bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600"
          rows={3}
        />
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-white !border-2 !border-zinc-900 hover:!scale-125 transition-transform"
      />
    </Card>
  );
});

TextInputNode.displayName = 'TextInputNode';