import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
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
  Cpu,
  Settings,
  MonitorSpeaker,
  Grid3x3,
  Home
} from 'lucide-react';

interface LeftSidebarProps {
  onAddNode: (type: string, data: any) => void;
}

export const LeftSidebar = ({ onAddNode }: LeftSidebarProps) => {
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
        { type: 'controlNet', label: 'Canny', icon: Zap, data: { label: 'Canny Edge', preprocessor: 'canny' } },
        { type: 'controlNet', label: 'Depth', icon: Layers, data: { label: 'Depth Control', preprocessor: 'depth' } },
        { type: 'controlNet', label: 'Normal', icon: Eye, data: { label: 'Normal Map', preprocessor: 'normalbae' } },
        { type: 'controlNet', label: 'Segments', icon: Grid3x3, data: { label: 'Segmentation', preprocessor: 'seg' } },
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
        { type: 'tool', label: 'Outpaint', icon: Crop, data: { label: 'Outpaint', toolType: 'outpaint', width: 1280, height: 1280, outpaintTop: 256, outpaintRight: 256, outpaintBottom: 256, outpaintLeft: 256 } },
      ]
    },
    {
      title: 'Engine',
      nodes: [
        { type: 'engine', label: 'Engine', icon: Cpu, data: { label: 'Generation Engine', model: 'runware:101@1', width: 1024, height: 1024, steps: 28, cfgScale: 3.5, strength: 0.8 } },
        { type: 'gear', label: 'Gear', icon: Settings, data: { label: 'LoRA Gear', loraModel: '', weight: 1.0 } },
        { type: 'output', label: 'Output', icon: MonitorSpeaker, data: { label: 'Output' } },
      ]
    }
  ];

  return (
    <div className="w-72 h-full bg-[#0f0f0f] border-r-2 border-zinc-800">
      <div className="p-4 border-b-2 border-zinc-800 space-y-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-black to-zinc-900 border-2 border-zinc-700">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Nodes</h2>
            <p className="text-sm text-zinc-500">Drag to canvas</p>
          </div>
        </div>

        {/* Home Button */}
        <Link to="/">
          <Button
            variant="outline"
            size="sm"
            className="w-full bg-zinc-900 border-zinc-800 hover:bg-zinc-800 hover:border-zinc-700 text-zinc-200 transition-all"
          >
            <Home className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </Link>
      </div>

      <ScrollArea className="h-[calc(100vh-120px)]">
        <div className="p-4 space-y-6">
          {nodeCategories.map((category, categoryIndex) => (
            <div key={category.title}>
              <h3 className="text-sm font-medium text-zinc-400 mb-3 uppercase tracking-wider">
                {category.title}
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {category.nodes.map((node) => {
                  const IconComponent = node.icon;
                  return (
                    <Button
                      key={node.type + node.label}
                      variant="surface"
                      size="sm"
                      className="flex flex-col h-20 p-3 group hover:scale-105 transition-all duration-200 bg-zinc-900 border-2 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800 shadow-lg hover:shadow-xl"
                      onClick={() => onAddNode(node.type, node.data)}
                    >
                      <div className="p-1.5 rounded-md bg-gradient-to-br from-black to-zinc-800 border border-zinc-700 mb-2 group-hover:border-zinc-600 transition-colors">
                        <IconComponent className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-xs font-medium text-center leading-tight text-zinc-200">{node.label}</span>
                    </Button>
                  );
                })}
              </div>
              {categoryIndex < nodeCategories.length - 1 && (
                <Separator className="mt-6 bg-zinc-800" />
              )}
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};