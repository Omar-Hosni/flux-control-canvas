import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Type, 
  Image, 
  Zap, 
  Layers, 
  Users, 
  Eye, 
  RotateCcw, 
  Palette,
  Camera,
  Shuffle,
  Eraser,
  ArrowUp,
  PaintBucket,
  Crop,
  Play,
  Cpu,
  ArrowLeft,
  Home,
  Settings
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface WorkflowToolbarProps {
  onAddNode: (type: string, data: any) => void;
}

export const WorkflowToolbar = ({ onAddNode }: WorkflowToolbarProps) => {
  const navigate = useNavigate();
  const nodeCategories = [
    {
      title: 'Input',
      nodes: [
        { type: 'textInput', label: 'Text', icon: Type, data: { label: 'Text Input', prompt: '' } },
        { type: 'imageInput', label: 'Image', icon: Image, data: { label: 'Image Input', imageUrl: null } },
      ]
    },
    {
      title: 'ControlNet',
      nodes: [
        { type: 'controlNet', label: 'Pose', icon: Users, data: { label: 'Pose Control', preprocessor: 'openpose' } },
        { type: 'controlNet', label: 'Edge', icon: Zap, data: { label: 'Edge Control', preprocessor: 'canny' } },
        { type: 'controlNet', label: 'Depth', icon: Layers, data: { label: 'Depth Control', preprocessor: 'depth' } },
        { type: 'controlNet', label: 'Light', icon: Eye, data: { label: 'Light Control', preprocessor: 'normal' } },
      ]
    },
    {
      title: 'Re-rendering',
      nodes: [
        { type: 'rerendering', label: 'Re-imagine', icon: RotateCcw, data: { label: 'Re-imagine', rerenderingType: 'reimagine', creativity: 0.8 } },
        { type: 'rerendering', label: 'Reference', icon: Palette, data: { label: 'Reference', rerenderingType: 'reference', referenceType: 'style' } },
        { type: 'rerendering', label: 'Re-scene', icon: Camera, data: { label: 'Re-scene', rerenderingType: 'rescene' } },
        { type: 'rerendering', label: 'Re-angle', icon: RotateCcw, data: { label: 'Re-angle', rerenderingType: 'reangle', degrees: 15, direction: 'right' } },
        { type: 'rerendering', label: 'Re-mix', icon: Shuffle, data: { label: 'Re-mix', rerenderingType: 'remix' } },
      ]
    },
    {
      title: 'Tools',
      nodes: [
        { type: 'tool', label: 'Remove BG', icon: Eraser, data: { label: 'Remove Background', toolType: 'removebg' } },
        { type: 'tool', label: 'Upscale', icon: ArrowUp, data: { label: 'Upscale', toolType: 'upscale', upscaleFactor: 2 } },
        { type: 'tool', label: 'Inpaint', icon: PaintBucket, data: { label: 'Inpaint', toolType: 'inpaint' } },
        { type: 'tool', label: 'Outpaint', icon: Crop, data: { label: 'Outpaint', toolType: 'outpaint', width: 1280, height: 1280, outpaintTop: 0, outpaintRight: 0, outpaintBottom: 0, outpaintLeft: 0 } },
      ]
    },
    {
      title: 'Engine',
      nodes: [
        { type: 'engine', label: 'Engine', icon: Cpu, data: { label: 'Generation Engine', model: 'runware:101@1', width: 1024, height: 1024, steps: 28, cfgScale: 3.5, strength: 0.8 } },
        { type: 'gear', label: 'Gear', icon: Settings, data: { label: 'LoRA Gear', loraModel: 'runware:25@1', weight: 1.0 } },
      ]
    }
  ];

  return (
    <Card className="m-4 p-4 bg-ai-surface border-border shadow-card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-primary">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Workflow Editor</h2>
            <p className="text-sm text-muted-foreground">Drag and drop nodes to build your AI workflow</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="surface"
            size="sm"
            onClick={() => navigate('/')}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Studio
          </Button>
          <Badge variant="secondary" className="gap-2">
            <Play className="w-3 h-3" />
            Ready
          </Badge>
        </div>
      </div>

      <div className="flex gap-6 overflow-x-auto pb-2">
        {nodeCategories.map((category, categoryIndex) => (
          <div key={category.title} className="flex-shrink-0">
            <h3 className="text-sm font-medium text-muted-foreground mb-3">
              {category.title}
            </h3>
            <div className="flex gap-2">
              {category.nodes.map((node) => {
                const IconComponent = node.icon;
                return (
                  <Button
                    key={node.type + node.label}
                    variant="surface"
                    size="sm"
                    className="flex flex-col h-20 w-20 p-3 group hover:scale-105 hover:shadow-glow transition-all duration-300 bg-ai-surface border-border hover:border-primary/50 hover:bg-ai-surface-elevated"
                    onClick={() => onAddNode(node.type, node.data)}
                  >
                    <div className="p-1.5 rounded-md bg-gradient-primary mb-2 group-hover:shadow-ai transition-shadow">
                      <IconComponent className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-xs font-medium text-center leading-tight">{node.label}</span>
                  </Button>
                );
              })}
            </div>
            {categoryIndex < nodeCategories.length - 1 && (
              <Separator orientation="vertical" className="ml-4 bg-border" />
            )}
          </div>
        ))}
      </div>
    </Card>
  );
};