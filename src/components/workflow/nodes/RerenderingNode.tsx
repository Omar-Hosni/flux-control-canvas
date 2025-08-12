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
    case 'reimagine': return 'from-indigo-500 to-purple-500';
    case 'reference': return 'from-pink-500 to-rose-500';
    case 'rescene': return 'from-emerald-500 to-teal-500';
    case 'reangle': return 'from-amber-500 to-orange-500';
    case 'remix': return 'from-violet-500 to-purple-500';
    default: return 'from-gray-500 to-gray-600';
  }
};

export const RerenderingNode = memo(({ id, data }: RerenderingNodeProps) => {
  const { updateNodeData } = useWorkflowStore();

  const renderSettings = () => {
    const commonSettings = (
      <div className="space-y-2">
        {/* Model Selection */}
        <div>
          <Label className="text-xs text-muted-foreground">Model</Label>
          <Select
            value={data.model || 'flux-kontext'}
            onValueChange={(value) => updateNodeData(id, { model: value })}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="flux-kontext">Flux Kontext</SelectItem>
              <SelectItem value="flux-kontext-pro">Flux Kontext Pro</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Size Ratio for Flux Kontext Pro */}
        {data.model === 'flux-kontext-pro' && (
          <div>
            <Label className="text-xs text-muted-foreground">Size Ratio</Label>
            <Select
              value={data.sizeRatio || '1:1'}
              onValueChange={(value) => updateNodeData(id, { sizeRatio: value })}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1:1">1:1 (1024x1024)</SelectItem>
                <SelectItem value="21:9">21:9 (1568x672)</SelectItem>
                <SelectItem value="16:9">16:9 (1344x768)</SelectItem>
                <SelectItem value="4:3">4:3 (1152x896)</SelectItem>
                <SelectItem value="3:2">3:2 (1216x832)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
    );

    switch (data.rerenderingType) {
      case 'reimagine':
        return (
          <div className="text-xs text-muted-foreground">
            Uses input image as seed image for generation
          </div>
        );

      case 'reference':
        return (
          <div className="space-y-3">
            {commonSettings}
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
            {commonSettings}
            <div className="text-xs text-muted-foreground">
              Connect two images: object + scene
            </div>
          </div>
        );

      case 'reangle':
        return (
          <div className="space-y-3">
            {commonSettings}
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
            {commonSettings}
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
    <Card className="min-w-48 p-4 bg-ai-surface border-border shadow-card">
      <div className="flex items-center gap-2 mb-3">
        <div className={`p-1.5 rounded bg-gradient-to-br ${getProcessingColor(data.rerenderingType)}`}>
          {getProcessingIcon(data.rerenderingType)}
        </div>
        <h3 className="text-sm font-medium text-foreground">{data.label}</h3>
      </div>

      <div className="space-y-3">
        <Badge variant="secondary" className="text-xs">
          {data.rerenderingType === 'reimagine' ? 'Seed Image' : data.model === 'flux-kontext-pro' ? 'Flux Kontext Pro' : data.model === 'flux-kontext' ? 'Flux Kontext' : 'Re-rendering'}
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

RerenderingNode.displayName = 'RerenderingNode';