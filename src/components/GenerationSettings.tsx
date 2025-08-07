import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Sparkles, Settings, Sliders } from 'lucide-react';
import type { GenerateImageParams } from '@/services/RunwareService';

interface GenerationSettingsProps {
  onGenerate: (params: GenerateImageParams) => void;
  isGenerating: boolean;
  hasPreprocessedImage: boolean;
  preprocessedImageUrl?: string;
}

export const GenerationSettings = ({
  onGenerate,
  isGenerating,
  hasPreprocessedImage,
  preprocessedImageUrl
}: GenerationSettingsProps) => {
  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [steps, setSteps] = useState([28]);
  const [cfgScale, setCfgScale] = useState([3.5]);
  const [width, setWidth] = useState([1024]);
  const [height, setHeight] = useState([1024]);
  const [controlWeight, setControlWeight] = useState([1]);
  const [scheduler, setScheduler] = useState('FlowMatchEulerDiscreteScheduler');
  const [model, setModel] = useState('runware:101@1');

  const handleGenerate = () => {
    if (!prompt.trim() || !hasPreprocessedImage) return;

    const params: GenerateImageParams = {
      positivePrompt: prompt,
      model,
      numberResults: 1,
      outputFormat: 'JPEG',
      width: width[0],
      height: height[0],
      steps: steps[0],
      CFGScale: cfgScale[0],
      scheduler,
      controlNet: preprocessedImageUrl ? [{
        model: 'runware:29@1', // CNFlux ControlNet
        guideImage: preprocessedImageUrl,
        weight: controlWeight[0],
        startStep: 0,
        endStep: steps[0],
        controlMode: 'balanced'
      }] : undefined
    };

    onGenerate(params);
  };

  return (
    <Card className="p-6 bg-ai-surface border-border shadow-card">
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-primary">
            <Settings className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">
              Generation Settings
            </h3>
            <p className="text-sm text-muted-foreground">
              Configure your AI image generation parameters
            </p>
          </div>
        </div>

        <Separator className="bg-border" />

        {/* Prompt */}
        <div className="space-y-3">
          <Label htmlFor="prompt" className="text-sm font-medium">
            Prompt
          </Label>
          <Textarea
            id="prompt"
            placeholder="Describe the image you want to generate..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="min-h-20 bg-ai-surface-elevated border-border focus:border-primary/50"
          />
        </div>

        {/* Model & Scheduler */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Model</Label>
            <Select value={model} onValueChange={setModel}>
              <SelectTrigger className="bg-ai-surface-elevated border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="runware:101@1">Flux (runware:101@1)</SelectItem>
                <SelectItem value="runware:100@1">Flux Schnell</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Scheduler</Label>
            <Select value={scheduler} onValueChange={setScheduler}>
              <SelectTrigger className="bg-ai-surface-elevated border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="FlowMatchEulerDiscreteScheduler">Flow Match Euler</SelectItem>
                <SelectItem value="EulerDiscreteScheduler">Euler Discrete</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Dimensions */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-3">
            <Label className="text-sm font-medium">
              Width: {width[0]}px
            </Label>
            <Slider
              value={width}
              onValueChange={setWidth}
              min={512}
              max={1536}
              step={64}
              className="w-full"
            />
          </div>
          <div className="space-y-3">
            <Label className="text-sm font-medium">
              Height: {height[0]}px
            </Label>
            <Slider
              value={height}
              onValueChange={setHeight}
              min={512}
              max={1536}
              step={64}
              className="w-full"
            />
          </div>
        </div>

        {/* Advanced Settings */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <Label className="text-sm font-medium">
              Steps: {steps[0]}
            </Label>
            <Slider
              value={steps}
              onValueChange={setSteps}
              min={1}
              max={50}
              step={1}
              className="w-full"
            />
          </div>
          <div className="space-y-3">
            <Label className="text-sm font-medium">
              CFG Scale: {cfgScale[0]}
            </Label>
            <Slider
              value={cfgScale}
              onValueChange={setCfgScale}
              min={1}
              max={20}
              step={0.5}
              className="w-full"
            />
          </div>
        </div>

        {/* ControlNet Settings */}
        {hasPreprocessedImage && (
          <div className="space-y-3 p-4 bg-ai-surface-elevated rounded-lg border border-border">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-primary" />
              <Label className="text-sm font-medium">ControlNet Settings</Label>
              <Badge variant="secondary" className="text-xs">Active</Badge>
            </div>
            <div className="space-y-3">
              <Label className="text-sm font-medium">
                Control Weight: {controlWeight[0]}
              </Label>
              <Slider
                value={controlWeight}
                onValueChange={setControlWeight}
                min={0}
                max={2}
                step={0.1}
                className="w-full"
              />
            </div>
          </div>
        )}

        {/* Generate Button */}
        <Button
          variant="generate"
          size="xl"
          onClick={handleGenerate}
          disabled={!prompt.trim() || !hasPreprocessedImage || isGenerating}
          className="w-full"
        >
          {isGenerating ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              Generate Image
            </>
          )}
        </Button>

        {!hasPreprocessedImage && (
          <p className="text-sm text-muted-foreground text-center">
            Upload and preprocess an image first to enable generation
          </p>
        )}
      </div>
    </Card>
  );
};