import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Cpu, Settings, Type, Image, Users, Eye, Layers, RotateCcw, Palette, Camera, Shuffle, Eraser, ArrowUp, PaintBucket, Crop, MonitorSpeaker, Zap } from 'lucide-react';
import { useWorkflowStore } from '@/stores/workflowStore';
import RiveInput from './RiveInput';
import { Node } from '@xyflow/react';

interface RightSidebarProps {
  selectedNode: Node | null;
}

interface NodeData {
  label?: string;
  prompt?: string;
  model?: string;
  width?: number;
  height?: number;
  steps?: number;
  cfgScale?: number;
  loraModel?: string;
  weight?: number;
  preprocessor?: string;
  strength?: number;
  [key: string]: any;
}

const getNodeIcon = (nodeType: string) => {
  const iconMap = {
    textInput: Type,
    imageInput: Image,
    controlNet: Users,
    rerendering: RotateCcw,
    tool: Eraser,
    engine: Cpu,
    gear: Settings,
    output: MonitorSpeaker,
  };
  return iconMap[nodeType as keyof typeof iconMap] || Zap;
};

const getWorkflows = (nodes: Node[], edges: any[]) => {
  const engineNodes = nodes.filter(node => node.type === 'engine');

  return engineNodes.map((engineNode, index) => {
    // Find all connected nodes to this engine
    const connectedEdges = edges.filter(edge =>
      edge.source === engineNode.id || edge.target === engineNode.id
    );

    const connectedNodeIds = new Set();
    connectedEdges.forEach(edge => {
      connectedNodeIds.add(edge.source);
      connectedNodeIds.add(edge.target);
    });

    const connectedNodes = nodes.filter(node => connectedNodeIds.has(node.id));
    const data = engineNode.data as NodeData;

    return {
      id: engineNode.id,
      name: data.label || `Workflow ${index + 1}`,
      nodeCount: connectedNodes.length,
      engineModel: data.model || 'runware:101@1'
    };
  });
};

export const RightSidebar = ({ selectedNode }: RightSidebarProps) => {
  const { nodes, edges, updateNodeData, getProcessedImage } = useWorkflowStore();
  const workflows = getWorkflows(nodes, edges);

  const NodeIcon = selectedNode ? getNodeIcon(selectedNode.type!) : Zap;

  const renderNodeProperties = () => {
    if (!selectedNode) return null;

    const nodeData = selectedNode.data as NodeData;

    const handleUpdateData = (key: string, value: any) => {
      updateNodeData(selectedNode.id, { [key]: value });
    };

    switch (selectedNode.type) {
      case 'textInput':
        return (
          <div className="space-y-4">
            <div>
              <Label className="text-xs text-muted-foreground">Label</Label>
              <Input
                value={nodeData.label || ''}
                onChange={(e) => handleUpdateData('label', e.target.value)}
                className="h-8 text-xs"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Prompt</Label>
              <Textarea
                value={nodeData.prompt || ''}
                onChange={(e) => handleUpdateData('prompt', e.target.value)}
                className="text-xs min-h-20"
                placeholder="Enter your prompt..."
              />
            </div>
          </div>
        );

      case 'engine':
        return (
          <div className="space-y-4">
            <div>
              <Label className="text-xs text-muted-foreground">Model</Label>
              <Select
                value={nodeData.model || 'runware:101@1'}
                onValueChange={(value) => handleUpdateData('model', value)}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="runware:100@1">Flux Schnell</SelectItem>
                  <SelectItem value="runware:101@1">Flux Dev</SelectItem>
                  <SelectItem value="runware:502@1">Flux Kontext</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs text-muted-foreground">Width</Label>
                <Input
                  type="number"
                  value={nodeData.width || 1024}
                  onChange={(e) => handleUpdateData('width', parseInt(e.target.value))}
                  className="h-8 text-xs"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Height</Label>
                <Input
                  type="number"
                  value={nodeData.height || 1024}
                  onChange={(e) => handleUpdateData('height', parseInt(e.target.value))}
                  className="h-8 text-xs"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs text-muted-foreground">Steps</Label>
                <Input
                  type="number"
                  value={nodeData.steps || 28}
                  onChange={(e) => handleUpdateData('steps', parseInt(e.target.value))}
                  className="h-8 text-xs"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">CFG Scale</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={nodeData.cfgScale || 3.5}
                  onChange={(e) => handleUpdateData('cfgScale', parseFloat(e.target.value))}
                  className="h-8 text-xs"
                />
              </div>
            </div>
          </div>
        );

      case 'gear':
        return (
          <div className="space-y-4">
            <div>
              <Label className="text-xs text-muted-foreground">LoRA Model</Label>
              <Select
                value={nodeData.loraModel || ''}
                onValueChange={(value) => handleUpdateData('loraModel', value)}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Select LoRA" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="runware:25@1">Amateur Photography</SelectItem>
                  <SelectItem value="runware:26@1">Detail Tweaker</SelectItem>
                  <SelectItem value="runware:27@1">Realistic</SelectItem>
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
                value={nodeData.weight || 1.0}
                onChange={(e) => handleUpdateData('weight', parseFloat(e.target.value) || 1.0)}
                className="h-8 text-xs"
              />
            </div>
          </div>
        );

      case 'controlNet':
        const isOpenPose = nodeData.preprocessor === 'openpose';
        const guidedImageURL = nodeData.guidedImageURL;

        return (
          <div className="space-y-4">
            <div>
              <Label className="text-xs text-muted-foreground">Preprocessor</Label>
              <Select
                value={nodeData.preprocessor || 'openpose'}
                onValueChange={(value) => handleUpdateData('preprocessor', value)}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="openpose">OpenPose</SelectItem>
                  <SelectItem value="canny">Canny Edge</SelectItem>
                  <SelectItem value="depth">Depth</SelectItem>
                  <SelectItem value="normal">Normal Map</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Strength</Label>
              <Input
                type="number"
                min="0"
                max="1"
                step="0.1"
                value={nodeData.strength || 0.8}
                onChange={(e) => handleUpdateData('strength', parseFloat(e.target.value) || 0.8)}
                className="h-8 text-xs"
              />
            </div>

            {/* Show preprocessed image or Rive component */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Preview</Label>
              {(() => {
                const isLight = nodeData.preprocessor === 'normal';
                const isImageConnected = edges.some(
                  (e) => e.target === selectedNode.id && nodes.find((n) => n.id === e.source)?.type === 'imageInput'
                );
                const processedUrl = getProcessedImage(selectedNode.id) || guidedImageURL;

                if (isOpenPose) {
                  if (isImageConnected) {
                    return processedUrl ? (
                      <div className="w-full">
                        <img
                          src={processedUrl}
                          alt="Preprocessed"
                          className="w-full h-auto max-h-48 object-contain rounded border border-border"
                        />
                      </div>
                    ) : (
                      <div className="w-full h-32 bg-ai-surface-elevated border border-dashed border-border rounded flex items-center justify-center">
                        <p className="text-xs text-muted-foreground text-center">Preprocessing…</p>
                      </div>
                    );
                  }
                  // No image connected -> show pose Rive editor
                  return <RiveInput nodeType="pose" />;
                }

                if (isLight) {
                  // Always show Lights Rive for Light Control node
                  return <RiveInput nodeType="lights" />;
                }

                return (
                  <div className="w-full h-32 bg-ai-surface-elevated border border-dashed border-border rounded flex items-center justify-center">
                    <p className="text-xs text-muted-foreground text-center">Connect an image input to see preview</p>
                  </div>
                );
              })()}
            </div>
          </div>
        );

      case 'output':
        return (
          <div className="space-y-4">
            <div>
              <Label className="text-xs text-muted-foreground">Aspect Ratio</Label>
              <Select
                value={nodeData.aspectRatio || '1:1'}
                onValueChange={(value) => handleUpdateData('aspectRatio', value)}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1:1">1:1 (Square)</SelectItem>
                  <SelectItem value="16:9">16:9 (Landscape)</SelectItem>
                  <SelectItem value="9:16">9:16 (Portrait)</SelectItem>
                  <SelectItem value="4:3">4:3 (Standard)</SelectItem>
                  <SelectItem value="3:4">3:4 (Portrait)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="text-xs text-muted-foreground">
              {(() => {
                const dimensions: Record<string, string> = {
                  '1:1': '320 × 320px',
                  '16:9': '480 × 270px',
                  '9:16': '270 × 480px',
                  '4:3': '400 × 300px',
                  '3:4': '300 × 400px',
                };
                return dimensions[nodeData.aspectRatio || '1:1'];
              })()}
            </div>
          </div>
        );

      default:
        // Check if this is a light node
        if (selectedNode.type?.includes('light') || (typeof selectedNode.data?.label === 'string' && selectedNode.data.label.toLowerCase().includes('light'))) {
          return (
            <div className="space-y-4">
              <div>
                <Label className="text-xs text-muted-foreground">Label</Label>
                <Input
                  value={nodeData.label || ''}
                  onChange={(e) => handleUpdateData('label', e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Light Setup</Label>
                <RiveInput nodeType="lights" />
              </div>
            </div>
          );
        }

        return (
          <div>
            <Label className="text-xs text-muted-foreground">Label</Label>
            <Input
              value={nodeData.label || ''}
              onChange={(e) => handleUpdateData('label', e.target.value)}
              className="h-8 text-xs"
            />
          </div>
        );
    }
  };

  return (
    <div className="w-80 h-full bg-ai-surface border-l border-border flex flex-col">
      {/* Selected Node Section */}
      <div className="border-b border-border">
        <div className="p-4">
          <h2 className="text-lg font-semibold text-foreground mb-4">Properties</h2>

          {selectedNode ? (
            <Card className="p-4 bg-ai-surface-elevated border-border">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-gradient-primary">
                  <NodeIcon className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="font-medium text-foreground">{(selectedNode.data as NodeData).label || 'Untitled'}</h3>
                  <Badge variant="secondary" className="text-xs">
                    {selectedNode.type}
                  </Badge>
                </div>
              </div>

              {renderNodeProperties()}
            </Card>
          ) : (
            <Card className="p-6 bg-ai-surface-elevated border-border border-dashed text-center">
              <p className="text-sm text-muted-foreground">
                Select a node to edit its properties
              </p>
            </Card>
          )}
        </div>
      </div>

      {/* Workflows Section */}
      <div className="flex-1 overflow-hidden">
        <div className="p-4">
          <h2 className="text-lg font-semibold text-foreground mb-4">Workflows</h2>

          <ScrollArea className="h-[calc(100vh-400px)]">
            <div className="space-y-3">
              {workflows.length > 0 ? (
                workflows.map((workflow, index) => (
                  <Card key={workflow.id} className="p-4 bg-ai-surface-elevated border-border">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-gradient-primary">
                        <Cpu className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-foreground text-sm">
                          {workflow.name}
                        </h4>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className="text-xs">
                            {workflow.nodeCount} nodes
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {workflow.engineModel.replace('runware:', '').replace('@1', '')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))
              ) : (
                <Card className="p-6 bg-ai-surface-elevated border-border border-dashed text-center">
                  <Cpu className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">
                    Add an Engine node to create a workflow
                  </p>
                </Card>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
};