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
  Play
} from 'lucide-react';

interface WorkflowToolbarProps {
  onAddNode: (type: string, data: any) => void;
}

export const WorkflowToolbar = ({ onAddNode }: WorkflowToolbarProps) => {
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
      title: 'Processing',
      nodes: [
        { type: 'processing', label: 'Re-imagine', icon: RotateCcw, data: { label: 'Re-imagine', processingType: 'reimagine' } },
        { type: 'processing', label: 'Reference', icon: Palette, data: { label: 'Reference', processingType: 'reference' } },
        { type: 'processing', label: 'Re-scene', icon: Camera, data: { label: 'Re-scene', processingType: 'rescene' } },
        { type: 'processing', label: 'Re-angle', icon: RotateCcw, data: { label: 'Re-angle', processingType: 'reangle' } },
        { type: 'processing', label: 'Re-mix', icon: Shuffle, data: { label: 'Re-mix', processingType: 'remix' } },
      ]
    },
    {
      title: 'Tools',
      nodes: [
        { type: 'tool', label: 'Remove BG', icon: Eraser, data: { label: 'Remove Background', toolType: 'removebg' } },
        { type: 'tool', label: 'Upscale', icon: ArrowUp, data: { label: 'Upscale', toolType: 'upscale' } },
        { type: 'tool', label: 'Inpaint', icon: PaintBucket, data: { label: 'Inpaint', toolType: 'inpaint' } },
        { type: 'tool', label: 'Outpaint', icon: Crop, data: { label: 'Outpaint', toolType: 'outpaint' } },
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
        <Badge variant="secondary" className="gap-2">
          <Play className="w-3 h-3" />
          Ready
        </Badge>
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
                    variant="outline"
                    size="sm"
                    className="flex flex-col h-16 w-16 p-2 bg-background hover:bg-gradient-glow hover:border-primary/50"
                    onClick={() => onAddNode(node.type, node.data)}
                  >
                    <IconComponent className="w-4 h-4 mb-1" />
                    <span className="text-xs">{node.label}</span>
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