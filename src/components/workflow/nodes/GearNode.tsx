import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Settings, Trash2 } from 'lucide-react';
import { useWorkflowStore } from '@/stores/workflowStore';

interface GearNodeProps {
  id: string;
  data: {
    label: string;
    loraModel: string;
    weight: number;
  };
}

const LORA_MODELS = [
  { value: 'runware:25@1', label: 'Amateur Photography' },
  { value: 'runware:26@1', label: 'Detail Tweaker' },
  { value: 'runware:27@1', label: 'Realistic' },
];

export const GearNode = memo(({ id, data }: GearNodeProps) => {
  const { updateNodeData } = useWorkflowStore();

  return (
    <Card className="min-w-52 p-4 bg-ai-surface border-border shadow-card">
      <div className="flex items-center gap-2 mb-3">
        <div className="p-1.5 rounded bg-gradient-to-br from-orange-500 to-yellow-500">
          <Settings className="w-3 h-3 text-white" />
        </div>
        <h3 className="text-sm font-medium text-foreground">{data.label}</h3>
      </div>

      <div className="space-y-3">
        <div>
          <Label className="text-xs text-muted-foreground">LoRA Model</Label>
          <Select
            value={data.loraModel}
            onValueChange={(value) => updateNodeData(id, { loraModel: value })}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Select LoRA" />
            </SelectTrigger>
            <SelectContent>
              {LORA_MODELS.map(model => (
                <SelectItem key={model.value} value={model.value} className="text-xs">
                  {model.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-xs text-muted-foreground">Weight</Label>
          <Input
            type="number"
            min="0"
            max="2"
            step="0.1"
            value={data.weight}
            onChange={(e) => updateNodeData(id, { weight: parseFloat(e.target.value) || 1.0 })}
            className="h-8 text-xs"
          />
        </div>

        <Badge variant="secondary" className="text-xs">
          LoRA Enhancement
        </Badge>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-orange-500 !border-2 !border-white"
      />
    </Card>
  );
});

GearNode.displayName = 'GearNode';