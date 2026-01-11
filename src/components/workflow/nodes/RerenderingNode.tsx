import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { RotateCcw, Palette, Camera, Shuffle, Play } from 'lucide-react';
import { useWorkflowStore } from '@/stores/workflowStore';

interface RerenderingNodeProps {
  id: string;
  data: {
    label: string;
    rerenderingType: 'reimagine' | 'reference' | 'rescene' | 'reangle' | 'remix';
    strength?: number;
    creativity?: number;
    referenceType?: string;
    degrees?: number;
    direction?: string;
    weights?: number[];
    model?: 'flux-kontext' | 'flux-kontext-pro';
    sizeRatio?: '1:1' | '21:9' | '16:9' | '4:3' | '3:2';
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
    case 'reimagine': return 'from-zinc-800 to-black';
    case 'reference': return 'from-zinc-700 to-zinc-900';
    case 'rescene': return 'from-zinc-600 to-zinc-800';
    case 'reangle': return 'from-black to-zinc-800';
    case 'remix': return 'from-zinc-900 to-black';
    default: return 'from-zinc-800 to-zinc-900';
  }
};

export const RerenderingNode = memo(({ id, data }: RerenderingNodeProps) => {
  const { updateNodeData } = useWorkflowStore();

  const renderSettings = () => {

    switch (data.rerenderingType) {
      case 'reimagine':
        return (
          <div className="space-y-3">
            <div>
              <Label className="text-xs text-zinc-400">Strength</Label>
              <Slider
                value={[data.strength || 0.6]}
                onValueChange={(value) => updateNodeData(id, { strength: value[0] })}
                max={1}
                min={0}
                step={0.1}
                className="w-full"
              />
              <span className="text-xs text-zinc-500">
                {((data.strength || 0.6) * 100).toFixed(0)}%
              </span>
            </div>
            <div className="text-xs text-zinc-500">
              Built-in prompt: "re-imagine image"
            </div>
          </div>
        );

      case 'reference':
        return (
          <div className="space-y-3">
            <div>
              <Label className="text-xs text-muted-foreground">Reference Type</Label>
              <Select
                value={data.referenceType || 'style'}
                onValueChange={(value) => updateNodeData(id, { referenceType: value })}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="style">Style</SelectItem>
                  <SelectItem value="product">Product</SelectItem>
                  <SelectItem value="character">Character</SelectItem>
                  <SelectItem value="composition">Composition</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case 'rescene':
        return (
          <div className="space-y-3">
            <div className="text-xs text-muted-foreground">
              Connect two images: object + scene
            </div>
          </div>
        );

      case 'reangle':
        return (
          <div className="space-y-3">
            <div>
              <Label className="text-xs text-muted-foreground">Degrees</Label>
              <Select
                value={String(data.degrees || 15)}
                onValueChange={(value) => updateNodeData(id, { degrees: Number(value) })}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5°</SelectItem>
                  <SelectItem value="10">10°</SelectItem>
                  <SelectItem value="15">15°</SelectItem>
                  <SelectItem value="30">30°</SelectItem>
                  <SelectItem value="45">45°</SelectItem>
                  <SelectItem value="90">90°</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Direction</Label>
              <Select
                value={data.direction || 'right'}
                onValueChange={(value) => updateNodeData(id, { direction: value })}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="up">Up</SelectItem>
                  <SelectItem value="down">Down</SelectItem>
                  <SelectItem value="left">Left</SelectItem>
                  <SelectItem value="right">Right</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case 'remix':
        return (
          <div className="space-y-3">
            <div className="text-xs text-muted-foreground">
              Connect multiple images for IP adapter remix
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Card className="min-w-48 p-4 bg-[#1a1a1a] border-2 border-zinc-800 hover:border-zinc-700 shadow-xl hover:shadow-2xl transition-all duration-200">
      <div className="flex items-center gap-2 mb-3">
        <div className={`p-1.5 rounded bg-gradient-to-br ${getProcessingColor(data.rerenderingType)} border border-zinc-700`}>
          {getProcessingIcon(data.rerenderingType)}
        </div>
        <h3 className="text-sm font-medium text-white">{data.label}</h3>
      </div>

      <div className="space-y-3">
        <Badge variant="secondary" className="text-xs">
          {data.rerenderingType === 'reimagine' ? 'Seed Image' : 'Re-rendering'}
        </Badge>

        {renderSettings()}
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

RerenderingNode.displayName = 'RerenderingNode';