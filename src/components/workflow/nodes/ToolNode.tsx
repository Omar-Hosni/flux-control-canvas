import { memo, useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Eraser, ArrowUp, PaintBucket, Crop, Play, Upload } from 'lucide-react';
import { useWorkflowStore } from '@/stores/workflowStore';

interface ToolNodeProps {
  id: string;
  data: {
    label: string;
    toolType: 'removebg' | 'upscale' | 'inpaint' | 'outpaint';
    upscaleFactor?: number;
    inpaintPrompt?: string;
    maskImage?: string;
    outpaintPrompt?: string;
    outpaintDirection?: string;
    outpaintAmount?: number;
    width?: number;
    height?: number;
    outpaintTop?: number;
    outpaintRight?: number;
    outpaintBottom?: number;
    outpaintLeft?: number;
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
  const { updateNodeData } = useWorkflowStore();
  const [maskFile, setMaskFile] = useState<File | null>(null);

  const handleMaskUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setMaskFile(file);
      const url = URL.createObjectURL(file);
      updateNodeData(id, { maskImage: url });
    }
  };

  const renderSettings = () => {
    switch (data.toolType) {
      case 'upscale':
        return (
          <div>
            <Label className="text-xs text-muted-foreground">Scale Factor</Label>
            <Select
              value={String(data.upscaleFactor || 2)}
              onValueChange={(value) => updateNodeData(id, { upscaleFactor: Number(value) })}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2">2x</SelectItem>
                <SelectItem value="4">4x</SelectItem>
                <SelectItem value="8">8x</SelectItem>
              </SelectContent>
            </Select>
          </div>
        );

      case 'inpaint':
        return (
          <div className="space-y-2">
            <div>
              <Label className="text-xs text-muted-foreground">Mask Image</Label>
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs h-8"
                onClick={() => document.getElementById(`mask-${id}`)?.click()}
              >
                <Upload className="w-3 h-3 mr-1" />
                {maskFile ? 'Change Mask' : 'Upload Mask'}
              </Button>
              <input
                id={`mask-${id}`}
                type="file"
                accept="image/*"
                onChange={handleMaskUpload}
                className="hidden"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Inpaint Prompt</Label>
              <Textarea
                value={data.inpaintPrompt || ''}
                onChange={(e) => updateNodeData(id, { inpaintPrompt: e.target.value })}
                placeholder="Describe what to fill..."
                className="text-xs h-16 nodrag"
              />
            </div>
          </div>
        );

      case 'outpaint':
        return (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs text-muted-foreground">Width</Label>
                <Input
                  type="number"
                  value={data.width || 1280}
                  onChange={(e) => updateNodeData(id, { width: Number(e.target.value) })}
                  className="h-8 text-xs nodrag"
                  min="128"
                  max="2048"
                  step="64"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Height</Label>
                <Input
                  type="number"
                  value={data.height || 1280}
                  onChange={(e) => updateNodeData(id, { height: Number(e.target.value) })}
                  className="h-8 text-xs nodrag"
                  min="128"
                  max="2048"
                  step="64"
                />
              </div>
            </div>
            
            <div>
              <Label className="text-xs text-muted-foreground mb-2 block">Outpaint Values (px)</Label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs text-muted-foreground">Top</Label>
                  <Input
                    type="number"
                    value={data.outpaintTop || 0}
                    onChange={(e) => updateNodeData(id, { outpaintTop: Number(e.target.value) })}
                    className="h-8 text-xs nodrag"
                    min="0"
                    max="512"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Right</Label>
                  <Input
                    type="number"
                    value={data.outpaintRight || 0}
                    onChange={(e) => updateNodeData(id, { outpaintRight: Number(e.target.value) })}
                    className="h-8 text-xs nodrag"
                    min="0"
                    max="512"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Bottom</Label>
                  <Input
                    type="number"
                    value={data.outpaintBottom || 0}
                    onChange={(e) => updateNodeData(id, { outpaintBottom: Number(e.target.value) })}
                    className="h-8 text-xs nodrag"
                    min="0"
                    max="512"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Left</Label>
                  <Input
                    type="number"
                    value={data.outpaintLeft || 0}
                    onChange={(e) => updateNodeData(id, { outpaintLeft: Number(e.target.value) })}
                    className="h-8 text-xs nodrag"
                    min="0"
                    max="512"
                  />
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

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
        
        {renderSettings()}
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