import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Cpu, Play } from 'lucide-react';
import { useWorkflowStore } from '@/stores/workflowStore';

interface EngineNodeProps {
  id: string;
  data: {
    label: string;
    model: string;
    loras: string[];
    width: number;
    height: number;
    steps: number;
    cfgScale: number;
    strength: number;
  };
}

const MODELS = [
  { value: 'runware:100@1', label: 'Flux Schnell' },
  { value: 'runware:101@1', label: 'Flux Dev' },
  { value: 'runware:502@1', label: 'Flux Kontext' },
];

export const EngineNode = memo(({ id, data }: EngineNodeProps) => {
  const { updateNodeData, executeWorkflow, isGenerating } = useWorkflowStore();

  const handleGenerate = async () => {
    // Find ALL output nodes connected to this engine
    const { edges } = useWorkflowStore.getState();
    const connectedOutputs = edges.filter(edge => edge.source === id && edge.target.includes('output'));
    
    // Execute workflow for each connected output node
    for (const outputEdge of connectedOutputs) {
      await executeWorkflow(outputEdge.target);
    }
  };

  return (
    <Card className="min-w-64 p-4 bg-ai-surface border-border shadow-card">
      <div className="flex items-center gap-2 mb-3">
        <div className="p-1.5 rounded bg-gradient-to-br from-purple-600 to-blue-600">
          <Cpu className="w-3 h-3 text-white" />
        </div>
        <h3 className="text-sm font-medium text-foreground">{data.label}</h3>
      </div>

      <div className="space-y-3">
        <div>
          <Label className="text-xs text-muted-foreground">Model</Label>
          <Select
            value={data.model}
            onValueChange={(value) => updateNodeData(id, { model: value })}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MODELS.map(model => (
                <SelectItem key={model.value} value={model.value} className="text-xs">
                  {model.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Badge variant="secondary" className="text-xs">
          Generation Engine
        </Badge>
        
        <Button
          variant="ai"
          size="sm"
          className="w-full text-xs"
          onClick={handleGenerate}
          disabled={isGenerating}
        >
          {isGenerating ? (
            <>
              <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin mr-1" />
              Generating...
            </>
          ) : (
            <>
              <Play className="w-3 h-3 mr-1" />
              Generate
            </>
          )}
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

EngineNode.displayName = 'EngineNode';