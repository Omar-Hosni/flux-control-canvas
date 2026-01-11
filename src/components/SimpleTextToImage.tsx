import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useWorkflowStore } from '@/stores/workflowStore';
import { GeneratedImage } from '@/services/RunwareService';
import {
  ChevronDown,
  ChevronRight,
  Sparkles,
  Image as ImageIcon,
  Sliders,
  Layers,
  Zap,
  Settings2,
  Shuffle,
  Plus,
  Trash2,
  Upload,
  Link,
  Wand2,
  Download
} from 'lucide-react';

// Scheduler options
const FLUX_SCHEDULERS = [
  "Default",
  "FlowMatchEulerDiscreteScheduler",
  "Euler",
  "DPM++",
  "DPM++ SDE",
  "DPM++ 2M",
  "DPM++ 2M SDE",
  "DPM++ 3M",
  "Euler Beta",
  "Euler Exponential",
  "Euler Karras",
  "DPM++ Beta",
  "DPM++ Exponential",
  "DPM++ Karras",
  "DPM++ SDE Beta",
  "DPM++ SDE Exponential",
  "DPM++ SDE Karras",
  "DPM++ 2M Beta",
  "DPM++ 2M Exponential",
  "DPM++ 2M Karras",
  "DPM++ 2M SDE Beta",
  "DPM++ 2M SDE Exponential",
  "DPM++ 2M SDE Karras",
  "DPM++ 3M Beta",
  "DPM++ 3M Exponential",
  "DPM++ 3M Karras",
];

const SD_SCHEDULERS = [
  "Default",
  "DDIM",
  "DDIMScheduler",
  "DDPMScheduler",
  "DEISMultistepScheduler",
  "DPMSolverSinglestepScheduler",
  "DPMSolverMultistepScheduler",
  "DPMSolverMultistepInverse",
  "DPM++",
  "DPM++ Karras",
  "DPM++ 2M",
  "DPM++ 2M Karras",
  "DPM++ 2M SDE Karras",
  "DPM++ 2M SDE",
  "DPM++ 3M",
  "DPM++ 3M Karras",
  "DPM++ SDE Karras",
  "DPM++ SDE",
  "EDMEulerScheduler",
  "EDMDPMSolverMultistepScheduler",
  "Euler",
  "EulerDiscreteScheduler",
  "Euler Karras",
  "Euler a",
  "EulerAncestralDiscreteScheduler",
  "FlowMatchEulerDiscreteScheduler",
  "Heun",
  "HeunDiscreteScheduler",
  "Heun Karras",
  "IPNDMScheduler",
  "KDPM2DiscreteScheduler",
  "KDPM2AncestralDiscreteScheduler",
  "LCM",
  "LCMScheduler",
  "LMS",
  "LMSDiscreteScheduler",
  "LMS Karras",
  "PNDMScheduler",
  "TCDScheduler",
  "UniPC",
  "UniPCMultistepScheduler",
  "UniPC Karras",
  "UniPC 2M",
  "UniPC 2M Karras",
  "UniPC 3M",
  "UniPC 3M Karras",
];

interface LoRA {
  model: string;
  customModel: string;
  weight: number;
}

interface ControlNetItem {
  model: string;
  customModel: string;
  guideImageFile: File | null;
  guideImageUrl: string;
  weight: number;
  startStepPercentage: number;
  endStepPercentage: number;
  controlMode: "balanced" | "prompt" | "controlnet";
}

interface AcceleratorOptions {
  teaCache: boolean;
  teaCacheDistance: number;
  fbCache: boolean;
  fbCacheThreshold: number;
  deepCache: boolean;
  deepCacheInterval: number;
  deepCacheBranchId: number;
  cacheStartStepPercentage: number;
  cacheEndStepPercentage: number;
  cacheMaxConsecutiveSteps: number;
}

// Collapsible Section Component
const Section = ({
  title,
  icon: Icon,
  children,
  defaultOpen = false,
  badge
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  defaultOpen?: boolean;
  badge?: string;
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-lg bg-gradient-to-r from-ai-surface-elevated/80 to-ai-surface-elevated hover:from-ai-surface-elevated hover:to-ai-surface border border-border/50 transition-all duration-200 group">
        <div className="flex items-center gap-3">
          <div className="p-1.5 rounded-md bg-primary/10 text-primary">
            <Icon className="w-4 h-4" />
          </div>
          <span className="font-medium text-sm text-foreground">{title}</span>
          {badge && (
            <span className="px-2 py-0.5 text-xs rounded-full bg-primary/20 text-primary font-medium">
              {badge}
            </span>
          )}
        </div>
        {isOpen ? (
          <ChevronDown className="w-4 h-4 text-muted-foreground transition-transform" />
        ) : (
          <ChevronRight className="w-4 h-4 text-muted-foreground transition-transform" />
        )}
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-3 px-1">
        <div className="space-y-4 p-4 rounded-lg bg-ai-surface/50 border border-border/30">
          {children}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};

export const SimpleTextToImage = () => {
  const { runwareService } = useWorkflowStore();

  // Basic settings
  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [model, setModel] = useState('runware:101@1');
  const [customModel, setCustomModel] = useState('');
  const [width, setWidth] = useState(1024);
  const [height, setHeight] = useState(1024);
  const [numberResults, setNumberResults] = useState(1);
  const [outputFormat, setOutputFormat] = useState<'PNG' | 'WEBP' | 'JPEG'>('WEBP');

  // Generation settings
  const [steps, setSteps] = useState(28);
  const [cfgScale, setCfgScale] = useState(3.5);
  const [scheduler, setScheduler] = useState('Default');
  const [seed, setSeed] = useState<number | null>(null);
  const [strength, setStrength] = useState(0.8);

  // Include generation settings checkboxes (off by default)
  const [includeSteps, setIncludeSteps] = useState(false);
  const [includeCfgScale, setIncludeCfgScale] = useState(false);
  const [includeSeed, setIncludeSeed] = useState(false);
  const [includeStrength, setIncludeStrength] = useState(false);

  // Image inputs
  const [seedImageFile, setSeedImageFile] = useState<File | null>(null);
  const [seedImageUrl, setSeedImageUrl] = useState('');
  const [seedImageInputType, setSeedImageInputType] = useState<'upload' | 'url'>('upload');
  const [maskImageFile, setMaskImageFile] = useState<File | null>(null);
  const [maskImageUrl, setMaskImageUrl] = useState('');
  const [maskImageInputType, setMaskImageInputType] = useState<'upload' | 'url'>('upload');
  const [maskMargin, setMaskMargin] = useState(0);

  // Advanced options
  const [vae, setVae] = useState('');
  const [clipSkip, setClipSkip] = useState(0);
  const [promptWeighting, setPromptWeighting] = useState<'none' | 'compel' | 'sdEmbeds'>('none');

  // LoRAs
  const [loras, setLoras] = useState<LoRA[]>([]);

  // ControlNet
  const [controlNetItems, setControlNetItems] = useState<ControlNetItem[]>([]);

  // Advanced features
  const [layerDiffuse, setLayerDiffuse] = useState(false);
  const [hiresFix, setHiresFix] = useState(false);

  // Accelerator options
  const [enableAccelerator, setEnableAccelerator] = useState(false);
  const [acceleratorOptions, setAcceleratorOptions] = useState<AcceleratorOptions>({
    teaCache: false,
    teaCacheDistance: 0.5,
    fbCache: false,
    fbCacheThreshold: 0.25,
    deepCache: false,
    deepCacheInterval: 3,
    deepCacheBranchId: 0,
    cacheStartStepPercentage: 0,
    cacheEndStepPercentage: 100,
    cacheMaxConsecutiveSteps: 3,
  });

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [generationCost, setGenerationCost] = useState<number | null>(null);

  // Determine if using FLUX model
  const isFluxModel = model.includes('runware:100') || model.includes('runware:101') || model.includes('runware:106') || model.includes('flux');
  const schedulerOptions = isFluxModel ? FLUX_SCHEDULERS : SD_SCHEDULERS;

  // Handlers
  const handleAddLora = () => {
    setLoras([...loras, { model: 'custom', customModel: '', weight: 1.0 }]);
  };

  const handleRemoveLora = (index: number) => {
    setLoras(loras.filter((_, i) => i !== index));
  };

  const handleLoraChange = (index: number, field: keyof LoRA, value: string | number) => {
    const updated = [...loras];
    updated[index] = { ...updated[index], [field]: value };
    setLoras(updated);
  };

  const handleAddControlNet = () => {
    setControlNetItems([...controlNetItems, {
      model: 'custom',
      customModel: '',
      guideImageFile: null,
      guideImageUrl: '',
      weight: 1.0,
      startStepPercentage: 0,
      endStepPercentage: 100,
      controlMode: 'balanced',
    }]);
  };

  const handleRemoveControlNet = (index: number) => {
    setControlNetItems(controlNetItems.filter((_, i) => i !== index));
  };

  const handleControlNetChange = (index: number, field: keyof ControlNetItem, value: any) => {
    const updated = [...controlNetItems];
    updated[index] = { ...updated[index], [field]: value };
    setControlNetItems(updated);
  };

  const handleRandomSeed = () => {
    setSeed(Math.floor(Math.random() * 2147483647));
  };

  const handleClearSeed = () => {
    setSeed(null);
  };

  const uploadImageAndGetUrl = async (file: File): Promise<string> => {
    if (!runwareService) throw new Error('Runware service not initialized');
    return await runwareService.uploadImageForURL(file);
  };

  const handleGenerate = async () => {
    if (!runwareService) {
      setError('Runware service not initialized. Please set your API key.');
      return;
    }

    if (!prompt.trim()) {
      setError('Please enter a prompt');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setGeneratedImages([]);
    setGenerationCost(null);

    try {
      // Prepare seed image
      let seedImageValue: string | undefined;
      if (seedImageInputType === 'upload' && seedImageFile) {
        seedImageValue = await uploadImageAndGetUrl(seedImageFile);
      } else if (seedImageInputType === 'url' && seedImageUrl) {
        seedImageValue = seedImageUrl;
      }

      // Prepare mask image
      let maskImageValue: string | undefined;
      if (maskImageInputType === 'upload' && maskImageFile) {
        maskImageValue = await uploadImageAndGetUrl(maskImageFile);
      } else if (maskImageInputType === 'url' && maskImageUrl) {
        maskImageValue = maskImageUrl;
      }

      // Prepare ControlNet array
      const controlNetArray = await Promise.all(
        controlNetItems
          .filter(cn => cn.customModel || cn.guideImageFile || cn.guideImageUrl)
          .map(async (cn) => {
            let guideImage = cn.guideImageUrl;
            if (cn.guideImageFile) {
              guideImage = await uploadImageAndGetUrl(cn.guideImageFile);
            }
            return {
              model: cn.customModel,
              guideImage,
              weight: cn.weight,
              startStepPercentage: cn.startStepPercentage,
              endStepPercentage: cn.endStepPercentage,
              controlMode: cn.controlMode,
            };
          })
      );

      // Prepare LoRA array
      const loraArray = loras
        .filter(lora => lora.customModel.trim())
        .map(lora => ({
          model: lora.customModel,
          weight: lora.weight,
        }));

      // Build params
      const params: any = {
        positivePrompt: prompt,
        model: customModel || model,
        width,
        height,
        numberResults,
        outputFormat,
        scheduler: scheduler !== 'Default' ? scheduler : undefined,
      };

      // Only include generation settings if checkboxes are enabled
      if (includeSteps) params.steps = steps;
      if (includeCfgScale) params.CFGScale = cfgScale;
      if (includeSeed && seed !== null) params.seed = seed;

      if (negativePrompt) params.negativePrompt = negativePrompt;
      if (seedImageValue) {
        params.seedImage = seedImageValue;
        if (includeStrength) params.strength = strength;
      }
      if (maskImageValue) {
        params.maskImage = maskImageValue;
        if (maskMargin > 0) params.maskMargin = maskMargin;
      }
      if (vae) params.vae = vae;
      if (clipSkip > 0) params.clipSkip = clipSkip;
      if (promptWeighting !== 'none') params.promptWeighting = promptWeighting;
      if (loraArray.length > 0) params.lora = loraArray;
      if (controlNetArray.length > 0) params.controlNet = controlNetArray;

      // Advanced features
      if (layerDiffuse || hiresFix) {
        params.advancedFeatures = {};
        if (layerDiffuse) params.advancedFeatures.layerDiffuse = true;
        if (hiresFix) params.advancedFeatures.hiresfix = true;
      }

      // Accelerator options
      if (enableAccelerator) {
        const accelOpts: any = {};
        if (acceleratorOptions.teaCache) {
          accelOpts.teaCache = true;
          accelOpts.teaCacheDistance = acceleratorOptions.teaCacheDistance;
        }
        if (acceleratorOptions.fbCache) {
          accelOpts.fbCache = true;
          accelOpts.fbCacheThreshold = acceleratorOptions.fbCacheThreshold;
        }
        if (acceleratorOptions.deepCache) {
          accelOpts.deepCache = true;
          accelOpts.deepCacheInterval = acceleratorOptions.deepCacheInterval;
          accelOpts.deepCacheBranchId = acceleratorOptions.deepCacheBranchId;
        }
        accelOpts.cacheStartStepPercentage = acceleratorOptions.cacheStartStepPercentage;
        accelOpts.cacheEndStepPercentage = acceleratorOptions.cacheEndStepPercentage;
        accelOpts.cacheMaxConsecutiveSteps = acceleratorOptions.cacheMaxConsecutiveSteps;
        params.acceleratorOptions = accelOpts;
      }

      // Generate images
      const results: string[] = [];
      let totalCost = 0;

      for (let i = 0; i < numberResults; i++) {
        const result: GeneratedImage = await runwareService.generateImage({
          ...params,
          numberResults: 1,
        });
        console.log('Generation result:', result);
        console.log('Image URL:', result.imageURL);
        if (result.imageURL) {
          results.push(result.imageURL);
        } else {
          console.error('No imageURL in result:', result);
        }
        if (result.cost) totalCost += result.cost;
      }

      console.log('All generated images:', results);
      setGeneratedImages(results);
      if (totalCost > 0) setGenerationCost(totalCost);

    } catch (err) {
      console.error('Generation failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate image');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-background via-background to-ai-surface/20">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border/50 bg-ai-surface/30 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10">
            <Wand2 className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">Image Generation Playground</h2>
            <p className="text-sm text-muted-foreground">Full Runware API access with all parameters</p>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Controls Panel */}
        <div className="w-[480px] border-r border-border/50 overflow-y-auto custom-scrollbar">
          <div className="p-4 space-y-3">

            {/* Prompt Section - Always visible */}
            <div className="space-y-4 p-4 rounded-xl bg-gradient-to-br from-ai-surface-elevated to-ai-surface border border-border/50">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-foreground">Prompt</h3>
              </div>
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe what you want to generate..."
                className="min-h-[100px] resize-none bg-background/50 border-border/50 focus:border-primary/50"
              />
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Negative Prompt</Label>
                <Textarea
                  value={negativePrompt}
                  onChange={(e) => setNegativePrompt(e.target.value)}
                  placeholder="What to avoid..."
                  className="min-h-[60px] resize-none bg-background/50 border-border/50 text-sm"
                />
              </div>
            </div>

            {/* Model & Dimensions */}
            <Section title="Model & Dimensions" icon={Layers} defaultOpen={true}>
              <div className="space-y-4">
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Model</Label>
                  <Select value={model} onValueChange={setModel}>
                    <SelectTrigger className="bg-background/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="runware:100@1">Flux Schnell</SelectItem>
                      <SelectItem value="runware:101@1">Flux Dev</SelectItem>
                      <SelectItem value="runware:106@1">Flux Kontext</SelectItem>
                      <SelectItem value="runware:502@1">Flux Kontext Pro</SelectItem>
                      <SelectItem value="custom">Custom AIR Code</SelectItem>
                    </SelectContent>
                  </Select>
                  {model === 'custom' && (
                    <Input
                      className="mt-2 bg-background/50"
                      placeholder="civitai:123456@789 or runware:xxx@x"
                      value={customModel}
                      onChange={(e) => setCustomModel(e.target.value)}
                    />
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Width</Label>
                    <Input
                      type="number"
                      min={256}
                      max={2048}
                      step={64}
                      value={width}
                      onChange={(e) => setWidth(parseInt(e.target.value) || 1024)}
                      className="bg-background/50"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Height</Label>
                    <Input
                      type="number"
                      min={256}
                      max={2048}
                      step={64}
                      value={height}
                      onChange={(e) => setHeight(parseInt(e.target.value) || 1024)}
                      className="bg-background/50"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Number of Results</Label>
                    <Input
                      type="number"
                      min={1}
                      max={10}
                      value={numberResults}
                      onChange={(e) => setNumberResults(parseInt(e.target.value) || 1)}
                      className="bg-background/50"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Output Format</Label>
                    <Select value={outputFormat} onValueChange={(v: any) => setOutputFormat(v)}>
                      <SelectTrigger className="bg-background/50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PNG">PNG</SelectItem>
                        <SelectItem value="WEBP">WEBP</SelectItem>
                        <SelectItem value="JPEG">JPEG</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </Section>

            {/* Generation Settings */}
            <Section title="Generation Settings" icon={Sliders} defaultOpen={true}>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={includeSteps}
                        onChange={(e) => setIncludeSteps(e.target.checked)}
                        className="w-4 h-4 rounded border-border"
                      />
                      <Label className="text-xs text-muted-foreground">Steps</Label>
                    </div>
                    <span className="text-xs font-mono text-primary">{steps}</span>
                  </div>
                  <Slider
                    value={[steps]}
                    onValueChange={([v]) => setSteps(v)}
                    min={1}
                    max={100}
                    step={1}
                    className="py-1"
                    disabled={!includeSteps}
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={includeCfgScale}
                        onChange={(e) => setIncludeCfgScale(e.target.checked)}
                        className="w-4 h-4 rounded border-border"
                      />
                      <Label className="text-xs text-muted-foreground">CFG Scale</Label>
                    </div>
                    <span className="text-xs font-mono text-primary">{cfgScale.toFixed(1)}</span>
                  </div>
                  <Slider
                    value={[cfgScale]}
                    onValueChange={([v]) => setCfgScale(v)}
                    min={0}
                    max={30}
                    step={0.5}
                    className="py-1"
                    disabled={!includeCfgScale}
                  />
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Scheduler</Label>
                  <Select value={scheduler} onValueChange={setScheduler}>
                    <SelectTrigger className="bg-background/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      {schedulerOptions.map(s => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <input
                      type="checkbox"
                      checked={includeSeed}
                      onChange={(e) => setIncludeSeed(e.target.checked)}
                      className="w-4 h-4 rounded border-border"
                    />
                    <Label className="text-xs text-muted-foreground">Seed</Label>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      value={seed ?? ''}
                      onChange={(e) => setSeed(e.target.value ? parseInt(e.target.value) : null)}
                      placeholder="Random"
                      className="bg-background/50 flex-1"
                      disabled={!includeSeed}
                    />
                    <Button variant="outline" size="icon" onClick={handleRandomSeed} title="Random seed" disabled={!includeSeed}>
                      <Shuffle className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="icon" onClick={handleClearSeed} title="Clear seed" disabled={!includeSeed}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </Section>

            {/* Seed Image (Image-to-Image) */}
            <Section title="Seed Image" icon={ImageIcon} badge={seedImageFile || seedImageUrl ? "Active" : undefined}>
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Button
                    variant={seedImageInputType === 'upload' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSeedImageInputType('upload')}
                    className="flex-1"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Upload
                  </Button>
                  <Button
                    variant={seedImageInputType === 'url' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSeedImageInputType('url')}
                    className="flex-1"
                  >
                    <Link className="w-4 h-4 mr-2" />
                    URL
                  </Button>
                </div>

                {seedImageInputType === 'upload' ? (
                  <div>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setSeedImageFile(e.target.files?.[0] || null)}
                      className="bg-background/50"
                    />
                    {seedImageFile && (
                      <p className="text-xs text-muted-foreground mt-1">{seedImageFile.name}</p>
                    )}
                  </div>
                ) : (
                  <Input
                    placeholder="https://example.com/image.png"
                    value={seedImageUrl}
                    onChange={(e) => setSeedImageUrl(e.target.value)}
                    className="bg-background/50"
                  />
                )}

                {(seedImageFile || seedImageUrl) && (
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={includeStrength}
                          onChange={(e) => setIncludeStrength(e.target.checked)}
                          className="w-4 h-4 rounded border-border"
                        />
                        <Label className="text-xs text-muted-foreground">Strength</Label>
                      </div>
                      <span className="text-xs font-mono text-primary">{strength.toFixed(2)}</span>
                    </div>
                    <Slider
                      value={[strength]}
                      onValueChange={([v]) => setStrength(v)}
                      min={0}
                      max={1}
                      step={0.05}
                      className="py-1"
                      disabled={!includeStrength}
                    />
                  </div>
                )}
              </div>
            </Section>

            {/* Mask Image (Inpainting) */}
            <Section title="Mask Image" icon={ImageIcon} badge={maskImageFile || maskImageUrl ? "Active" : undefined}>
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Button
                    variant={maskImageInputType === 'upload' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setMaskImageInputType('upload')}
                    className="flex-1"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Upload
                  </Button>
                  <Button
                    variant={maskImageInputType === 'url' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setMaskImageInputType('url')}
                    className="flex-1"
                  >
                    <Link className="w-4 h-4 mr-2" />
                    URL
                  </Button>
                </div>

                {maskImageInputType === 'upload' ? (
                  <div>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setMaskImageFile(e.target.files?.[0] || null)}
                      className="bg-background/50"
                    />
                    {maskImageFile && (
                      <p className="text-xs text-muted-foreground mt-1">{maskImageFile.name}</p>
                    )}
                  </div>
                ) : (
                  <Input
                    placeholder="https://example.com/mask.png"
                    value={maskImageUrl}
                    onChange={(e) => setMaskImageUrl(e.target.value)}
                    className="bg-background/50"
                  />
                )}

                {(maskImageFile || maskImageUrl) && (
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <Label className="text-xs text-muted-foreground">Mask Margin</Label>
                      <span className="text-xs font-mono text-primary">{maskMargin}px</span>
                    </div>
                    <Slider
                      value={[maskMargin]}
                      onValueChange={([v]) => setMaskMargin(v)}
                      min={0}
                      max={256}
                      step={8}
                      className="py-1"
                    />
                  </div>
                )}
              </div>
            </Section>

            {/* LoRA Models */}
            <Section title="LoRA Models" icon={Layers} badge={loras.length > 0 ? `${loras.length}` : undefined}>
              <div className="space-y-3">
                {loras.map((lora, index) => (
                  <div key={index} className="p-3 rounded-lg bg-background/30 border border-border/30 space-y-3">
                    <div className="flex items-center gap-2">
                      <Input
                        placeholder="LoRA AIR code (e.g., civitai:123@1)"
                        value={lora.customModel}
                        onChange={(e) => handleLoraChange(index, 'customModel', e.target.value)}
                        className="bg-background/50 flex-1 text-sm"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveLora(index)}
                        className="h-8 w-8 text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <Label className="text-xs text-muted-foreground">Weight</Label>
                        <span className="text-xs font-mono text-primary">{lora.weight.toFixed(1)}</span>
                      </div>
                      <Slider
                        value={[lora.weight]}
                        onValueChange={([v]) => handleLoraChange(index, 'weight', v)}
                        min={-4}
                        max={4}
                        step={0.1}
                        className="py-1"
                      />
                    </div>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={handleAddLora} className="w-full">
                  <Plus className="w-4 h-4 mr-2" />
                  Add LoRA
                </Button>
              </div>
            </Section>

            {/* ControlNet */}
            <Section title="ControlNet" icon={Layers} badge={controlNetItems.length > 0 ? `${controlNetItems.length}` : undefined}>
              <div className="space-y-3">
                {controlNetItems.map((cn, index) => (
                  <div key={index} className="p-3 rounded-lg bg-background/30 border border-border/30 space-y-3">
                    <div className="flex items-center gap-2">
                      <Input
                        placeholder="ControlNet AIR code"
                        value={cn.customModel}
                        onChange={(e) => handleControlNetChange(index, 'customModel', e.target.value)}
                        className="bg-background/50 flex-1 text-sm"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveControlNet(index)}
                        className="h-8 w-8 text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>

                    <div>
                      <Label className="text-xs text-muted-foreground mb-1 block">Guide Image</Label>
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleControlNetChange(index, 'guideImageFile', e.target.files?.[0] || null)}
                        className="bg-background/50 text-sm"
                      />
                      <Input
                        placeholder="Or paste image URL"
                        value={cn.guideImageUrl}
                        onChange={(e) => handleControlNetChange(index, 'guideImageUrl', e.target.value)}
                        className="bg-background/50 mt-2 text-sm"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <Label className="text-xs text-muted-foreground">Weight</Label>
                          <span className="text-xs font-mono">{cn.weight.toFixed(1)}</span>
                        </div>
                        <Slider
                          value={[cn.weight]}
                          onValueChange={([v]) => handleControlNetChange(index, 'weight', v)}
                          min={0}
                          max={2}
                          step={0.1}
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1 block">Mode</Label>
                        <Select
                          value={cn.controlMode}
                          onValueChange={(v: any) => handleControlNetChange(index, 'controlMode', v)}
                        >
                          <SelectTrigger className="h-8 text-xs bg-background/50">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="balanced">Balanced</SelectItem>
                            <SelectItem value="prompt">Prompt</SelectItem>
                            <SelectItem value="controlnet">ControlNet</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <Label className="text-xs text-muted-foreground">Start %</Label>
                          <span className="text-xs font-mono">{cn.startStepPercentage}%</span>
                        </div>
                        <Slider
                          value={[cn.startStepPercentage]}
                          onValueChange={([v]) => handleControlNetChange(index, 'startStepPercentage', v)}
                          min={0}
                          max={99}
                          step={1}
                        />
                      </div>
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <Label className="text-xs text-muted-foreground">End %</Label>
                          <span className="text-xs font-mono">{cn.endStepPercentage}%</span>
                        </div>
                        <Slider
                          value={[cn.endStepPercentage]}
                          onValueChange={([v]) => handleControlNetChange(index, 'endStepPercentage', v)}
                          min={1}
                          max={100}
                          step={1}
                        />
                      </div>
                    </div>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={handleAddControlNet} className="w-full">
                  <Plus className="w-4 h-4 mr-2" />
                  Add ControlNet
                </Button>
              </div>
            </Section>

            {/* Advanced Options */}
            <Section title="Advanced Options" icon={Settings2}>
              <div className="space-y-4">
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">VAE (Optional)</Label>
                  <Input
                    placeholder="VAE AIR code (e.g., runware:xxx@x)"
                    value={vae}
                    onChange={(e) => setVae(e.target.value)}
                    className="bg-background/50"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <Label className="text-xs text-muted-foreground">CLIP Skip</Label>
                    <span className="text-xs font-mono text-primary">{clipSkip}</span>
                  </div>
                  <Slider
                    value={[clipSkip]}
                    onValueChange={([v]) => setClipSkip(v)}
                    min={0}
                    max={12}
                    step={1}
                    className="py-1"
                  />
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Prompt Weighting</Label>
                  <Select value={promptWeighting} onValueChange={(v: any) => setPromptWeighting(v)}>
                    <SelectTrigger className="bg-background/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="compel">Compel (advanced)</SelectItem>
                      <SelectItem value="sdEmbeds">SD Embeds (simple)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </Section>

            {/* Advanced Features */}
            <Section title="Advanced Features" icon={Sparkles}>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg bg-background/30">
                  <div>
                    <Label className="text-sm font-medium">Layer Diffuse</Label>
                    <p className="text-xs text-muted-foreground">Generate images with transparency (FLUX only)</p>
                  </div>
                  <Switch checked={layerDiffuse} onCheckedChange={setLayerDiffuse} />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-background/30">
                  <div>
                    <Label className="text-sm font-medium">HiresFix</Label>
                    <p className="text-xs text-muted-foreground">Two-stage generation for higher quality</p>
                  </div>
                  <Switch checked={hiresFix} onCheckedChange={setHiresFix} />
                </div>
              </div>
            </Section>

            {/* Accelerator Options */}
            <Section title="Accelerator Options" icon={Zap}>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg bg-background/30">
                  <div>
                    <Label className="text-sm font-medium">Enable Accelerator</Label>
                    <p className="text-xs text-muted-foreground">Speed up generation with caching</p>
                  </div>
                  <Switch checked={enableAccelerator} onCheckedChange={setEnableAccelerator} />
                </div>

                {enableAccelerator && (
                  <div className="space-y-4 pt-2">
                    {/* TeaCache */}
                    <div className="p-3 rounded-lg bg-background/20 space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm">TeaCache (for FLUX/SD3)</Label>
                        <Switch
                          checked={acceleratorOptions.teaCache}
                          onCheckedChange={(v) => setAcceleratorOptions({ ...acceleratorOptions, teaCache: v })}
                        />
                      </div>
                      {acceleratorOptions.teaCache && (
                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <Label className="text-xs text-muted-foreground">Distance</Label>
                            <span className="text-xs font-mono">{acceleratorOptions.teaCacheDistance.toFixed(1)}</span>
                          </div>
                          <Slider
                            value={[acceleratorOptions.teaCacheDistance]}
                            onValueChange={([v]) => setAcceleratorOptions({ ...acceleratorOptions, teaCacheDistance: v })}
                            min={0}
                            max={1}
                            step={0.1}
                          />
                        </div>
                      )}
                    </div>

                    {/* FBCache */}
                    <div className="p-3 rounded-lg bg-background/20 space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm">FBCache (First Block)</Label>
                        <Switch
                          checked={acceleratorOptions.fbCache}
                          onCheckedChange={(v) => setAcceleratorOptions({ ...acceleratorOptions, fbCache: v })}
                        />
                      </div>
                      {acceleratorOptions.fbCache && (
                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <Label className="text-xs text-muted-foreground">Threshold</Label>
                            <span className="text-xs font-mono">{acceleratorOptions.fbCacheThreshold.toFixed(2)}</span>
                          </div>
                          <Slider
                            value={[acceleratorOptions.fbCacheThreshold]}
                            onValueChange={([v]) => setAcceleratorOptions({ ...acceleratorOptions, fbCacheThreshold: v })}
                            min={0}
                            max={1}
                            step={0.05}
                          />
                        </div>
                      )}
                    </div>

                    {/* DeepCache */}
                    <div className="p-3 rounded-lg bg-background/20 space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm">DeepCache (for SDXL/SD1.5)</Label>
                        <Switch
                          checked={acceleratorOptions.deepCache}
                          onCheckedChange={(v) => setAcceleratorOptions({ ...acceleratorOptions, deepCache: v })}
                        />
                      </div>
                      {acceleratorOptions.deepCache && (
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <div className="flex justify-between items-center mb-1">
                              <Label className="text-xs text-muted-foreground">Interval</Label>
                              <span className="text-xs font-mono">{acceleratorOptions.deepCacheInterval}</span>
                            </div>
                            <Slider
                              value={[acceleratorOptions.deepCacheInterval]}
                              onValueChange={([v]) => setAcceleratorOptions({ ...acceleratorOptions, deepCacheInterval: v })}
                              min={1}
                              max={10}
                              step={1}
                            />
                          </div>
                          <div>
                            <div className="flex justify-between items-center mb-1">
                              <Label className="text-xs text-muted-foreground">Branch ID</Label>
                              <span className="text-xs font-mono">{acceleratorOptions.deepCacheBranchId}</span>
                            </div>
                            <Slider
                              value={[acceleratorOptions.deepCacheBranchId]}
                              onValueChange={([v]) => setAcceleratorOptions({ ...acceleratorOptions, deepCacheBranchId: v })}
                              min={0}
                              max={5}
                              step={1}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Cache Step Settings */}
                    <div className="p-3 rounded-lg bg-background/20 space-y-3">
                      <Label className="text-sm">Cache Step Range</Label>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <Label className="text-xs text-muted-foreground">Start %</Label>
                            <span className="text-xs font-mono">{acceleratorOptions.cacheStartStepPercentage}%</span>
                          </div>
                          <Slider
                            value={[acceleratorOptions.cacheStartStepPercentage]}
                            onValueChange={([v]) => setAcceleratorOptions({ ...acceleratorOptions, cacheStartStepPercentage: v })}
                            min={0}
                            max={99}
                            step={1}
                          />
                        </div>
                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <Label className="text-xs text-muted-foreground">End %</Label>
                            <span className="text-xs font-mono">{acceleratorOptions.cacheEndStepPercentage}%</span>
                          </div>
                          <Slider
                            value={[acceleratorOptions.cacheEndStepPercentage]}
                            onValueChange={([v]) => setAcceleratorOptions({ ...acceleratorOptions, cacheEndStepPercentage: v })}
                            min={1}
                            max={100}
                            step={1}
                          />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <Label className="text-xs text-muted-foreground">Max Consecutive Steps</Label>
                          <span className="text-xs font-mono">{acceleratorOptions.cacheMaxConsecutiveSteps}</span>
                        </div>
                        <Slider
                          value={[acceleratorOptions.cacheMaxConsecutiveSteps]}
                          onValueChange={([v]) => setAcceleratorOptions({ ...acceleratorOptions, cacheMaxConsecutiveSteps: v })}
                          min={1}
                          max={10}
                          step={1}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </Section>

            {/* Generate Button */}
            <div className="sticky bottom-0 pt-4 pb-2 bg-gradient-to-t from-background to-transparent">
              <Button
                onClick={handleGenerate}
                disabled={isGenerating || !runwareService || !prompt.trim()}
                className="w-full h-12 text-base font-semibold bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/25"
              >
                {isGenerating ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-5 h-5 mr-2" />
                    Generate Image
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Preview Panel */}
        <div className="flex-1 flex flex-col p-6 overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-foreground">Generated Images</h3>
            {generationCost !== null && (
              <span className="text-sm text-muted-foreground">
                Cost: ${generationCost.toFixed(4)}
              </span>
            )}
          </div>

          <div className="flex-1 flex items-center justify-center rounded-xl border border-border/50 bg-ai-surface/30 overflow-hidden">
            {error ? (
              <div className="p-6 text-center">
                <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive">
                  {error}
                </div>
              </div>
            ) : isGenerating ? (
              <div className="text-center space-y-4">
                <div className="relative">
                  <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary/20 border-t-primary mx-auto" />
                  <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 text-primary animate-pulse" />
                </div>
                <p className="text-muted-foreground">Creating your masterpiece...</p>
              </div>
            ) : generatedImages.length > 0 ? (
              <div className="w-full h-full p-4 overflow-auto">
                <div className={`grid gap-4 ${generatedImages.length === 1 ? 'grid-cols-1' : generatedImages.length <= 4 ? 'grid-cols-2' : 'grid-cols-3'}`}>
                  {generatedImages.map((url, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={url}
                        alt={`Generated ${index + 1}`}
                        className="w-full h-auto rounded-lg border border-border/50 shadow-lg"
                        crossOrigin="anonymous"
                        onError={(e) => {
                          console.error('Image failed to load:', url);
                          // Try without crossorigin as fallback
                          const target = e.target as HTMLImageElement;
                          if (target.crossOrigin) {
                            target.crossOrigin = '';
                            target.src = url;
                          }
                        }}
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => window.open(url, '_blank')}
                        >
                          <ImageIcon className="w-4 h-4 mr-1" />
                          Open
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `generated-${index + 1}.${outputFormat.toLowerCase()}`;
                            a.click();
                          }}
                        >
                          <Download className="w-4 h-4 mr-1" />
                          Save
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center space-y-3 text-muted-foreground">
                <div className="p-4 rounded-full bg-muted/30 mx-auto w-fit">
                  <ImageIcon className="w-12 h-12" />
                </div>
                <p>Your generated images will appear here</p>
                <p className="text-sm">Enter a prompt and click Generate</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};