import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useWorkflowStore } from '@/stores/workflowStore';
import { GeneratedImage } from '@/services/RunwareService';

interface LoRA {
  model: string;
  customModel: string;
  weight: number;
}

interface ReferenceImage {
  file: File | null;
  url: string | null;
}

export const SimpleTextToImage = () => {
  const { runwareService } = useWorkflowStore();
  const [mode, setMode] = useState<'text-to-image' | 'image-to-image'>('text-to-image');
  const [prompt, setPrompt] = useState('');
  const [model, setModel] = useState('runware:101@1');
  const [customModel, setCustomModel] = useState('');
  const [width, setWidth] = useState(1024);
  const [height, setHeight] = useState(1024);
  const [cfgScale, setCfgScale] = useState(3.5);
  const [loras, setLoras] = useState<LoRA[]>([{ model: 'none', customModel: '', weight: 1.0 }]);
  const [referenceImages, setReferenceImages] = useState<ReferenceImage[]>([{ file: null, url: null }]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAddLora = () => {
    setLoras([...loras, { model: 'none', customModel: '', weight: 1.0 }]);
  };

  const handleRemoveLora = (index: number) => {
    if (loras.length > 1) {
      setLoras(loras.filter((_, i) => i !== index));
    }
  };

  const handleLoraChange = (index: number, field: keyof LoRA, value: string | number) => {
    const updatedLoras = [...loras];
    updatedLoras[index] = { ...updatedLoras[index], [field]: value };
    setLoras(updatedLoras);
  };

  const handleAddReferenceImage = () => {
    setReferenceImages([...referenceImages, { file: null, url: null }]);
  };

  const handleRemoveReferenceImage = (index: number) => {
    if (referenceImages.length > 1) {
      setReferenceImages(referenceImages.filter((_, i) => i !== index));
    }
  };

  const handleReferenceImageChange = (index: number, file: File | null) => {
    const updatedImages = [...referenceImages];
    updatedImages[index] = { file, url: null };
    setReferenceImages(updatedImages);
  };

  const uploadReferenceImages = async () => {
    if (!runwareService) return [];

    const urls: string[] = [];
    for (let i = 0; i < referenceImages.length; i++) {
      const refImage = referenceImages[i];
      if (refImage.file) {
        try {
          const url = await runwareService.uploadImageForURL(refImage.file);
          urls.push(url);
        } catch (err) {
          console.error('Failed to upload reference image:', err);
          throw new Error('Failed to upload reference image');
        }
      }
    }
    return urls;
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

    if (mode === 'image-to-image' && referenceImages.every(img => !img.file)) {
      setError('Please upload at least one reference image for image-to-image mode');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setGeneratedImage(null);

    try {
      // Upload reference images first
      const referenceImageUrls = await uploadReferenceImages();

      // Use custom model if provided, otherwise use selected model
      const selectedModel = customModel || model;
      
      const params: any = {
        positivePrompt: prompt,
        model: selectedModel,
        width,
        height,
        CFGScale: cfgScale,
      };

      // Add reference images for image-to-image mode
      if (mode === 'image-to-image' && referenceImageUrls.length > 0) {
        params.referenceImages = referenceImageUrls;
      }

      // Add LoRAs if any are selected (not 'none')
      const loraArray = loras
        .filter(lora => lora.model && lora.model !== 'none')
        .map(lora => ({
          model: lora.customModel || lora.model,
          weight: lora.weight,
        }))
        .filter(lora => lora.model.trim() !== ''); // Remove empty custom models

      if (loraArray.length > 0) {
        params.lora = loraArray;
      }

      const result: GeneratedImage = await runwareService.generateImage(params);
      setGeneratedImage(result.imageURL);
    } catch (err) {
      console.error('Generation failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate image');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="h-full flex flex-col p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-foreground">Simple Text-to-Image</h2>
        <p className="text-muted-foreground">Generate images without ControlNet preprocessing</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1">
        <Card className="p-6 bg-ai-surface-elevated border-border">
          <div className="space-y-6">
            <div>
              <Label className="text-sm font-medium text-foreground">
                Mode
              </Label>
              <Select value={mode} onValueChange={(value: any) => setMode(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text-to-image">Text-to-Image</SelectItem>
                  <SelectItem value="image-to-image">Image-to-Image</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="prompt" className="text-sm font-medium text-foreground">
                Prompt
              </Label>
              <Textarea
                id="prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Enter your prompt..."
                className="min-h-32"
              />
            </div>

            {mode === 'image-to-image' && (
              <div className="space-y-4 p-4 bg-ai-surface rounded-lg border border-border">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium text-foreground">
                    Reference Images
                  </Label>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleAddReferenceImage}
                  >
                    Add Image
                  </Button>
                </div>
                
                {referenceImages.map((refImage, index) => (
                  <div key={index} className="space-y-2 p-3 bg-ai-surface-elevated rounded border">
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleReferenceImageChange(index, e.target.files?.[0] || null)}
                        />
                      </div>
                      
                      {referenceImages.length > 1 && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleRemoveReferenceImage(index)}
                          className="h-8 w-8 p-0"
                        >
                          ×
                        </Button>
                      )}
                    </div>
                    
                    {refImage.file && (
                      <div className="mt-2 text-xs text-muted-foreground">
                        {refImage.file.name}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div>
              <Label htmlFor="model" className="text-sm font-medium text-foreground">
                Model
              </Label>
              <Select value={model} onValueChange={setModel}>
                <SelectTrigger id="model">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="runware:100@1">Flux Schnell</SelectItem>
                  <SelectItem value="runware:101@1">Flux Dev</SelectItem>
                  <SelectItem value="runware:502@1">Flux Kontext</SelectItem>
                  <SelectItem value="custom">Custom AIR Code</SelectItem>
                </SelectContent>
              </Select>
              
              {model === 'custom' && (
                <div className="mt-2">
                  <Input
                    placeholder="Paste model AIR code here (e.g., civitai:123@1)"
                    value={customModel}
                    onChange={(e) => setCustomModel(e.target.value)}
                  />
                </div>
              )}
            </div>

            <div className="space-y-4 p-4 bg-ai-surface rounded-lg border border-border">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium text-foreground">
                  LoRA Models
                </Label>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleAddLora}
                >
                  Add LoRA
                </Button>
              </div>
              
              {loras.map((lora, index) => (
                <div key={index} className="space-y-2 p-3 bg-ai-surface-elevated rounded border">
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <Select 
                        value={lora.model} 
                        onValueChange={(value) => handleLoraChange(index, 'model', value)}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          <SelectItem value="runware:25@1">Amateur Photography</SelectItem>
                          <SelectItem value="runware:26@1">Detail Tweaker</SelectItem>
                          <SelectItem value="runware:27@1">Realistic</SelectItem>
                          <SelectItem value="custom">Custom AIR Code</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {loras.length > 1 && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleRemoveLora(index)}
                        className="h-8 w-8 p-0"
                      >
                        ×
                      </Button>
                    )}
                  </div>
                  
                  {lora.model === 'custom' && (
                    <div className="mt-2">
                      <Input
                        placeholder="Paste LoRA AIR code here (e.g., civitai:123@1)"
                        value={lora.customModel}
                        onChange={(e) => handleLoraChange(index, 'customModel', e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>
                  )}
                  
                  {lora.model && lora.model !== 'none' && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Weight:</span>
                      <Input
                        type="number"
                        min="0"
                        max="2"
                        step="0.1"
                        value={lora.weight}
                        onChange={(e) => handleLoraChange(index, 'weight', parseFloat(e.target.value) || 1.0)}
                        className="h-8 w-20 text-center"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="width" className="text-sm font-medium text-foreground">
                  Width
                </Label>
                <Input
                  id="width"
                  type="number"
                  min="256"
                  max="2048"
                  step="64"
                  value={width}
                  onChange={(e) => setWidth(parseInt(e.target.value) || 1024)}
                />
              </div>

              <div>
                <Label htmlFor="height" className="text-sm font-medium text-foreground">
                  Height
                </Label>
                <Input
                  id="height"
                  type="number"
                  min="256"
                  max="2048"
                  step="64"
                  value={height}
                  onChange={(e) => setHeight(parseInt(e.target.value) || 1024)}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="cfgScale" className="text-sm font-medium text-foreground">
                CFG Scale
              </Label>
              <Input
                id="cfgScale"
                type="number"
                min="0"
                max="30"
                step="0.1"
                value={cfgScale}
                onChange={(e) => setCfgScale(parseFloat(e.target.value) || 3.5)}
              />
            </div>

            <Button
              onClick={handleGenerate}
              disabled={isGenerating || !runwareService}
              className="w-full"
            >
              {isGenerating ? 'Generating...' : 'Generate Image'}
            </Button>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded text-sm text-red-400">
                {error}
              </div>
            )}
          </div>
        </Card>

        <Card className="p-6 bg-ai-surface-elevated border-border flex flex-col">
          <h3 className="text-lg font-medium text-foreground mb-4">Generated Image</h3>
          
          <div className="flex-1 flex items-center justify-center">
            {generatedImage ? (
              <img 
                src={generatedImage} 
                alt="Generated" 
                className="max-w-full max-h-full object-contain rounded border border-border"
              />
            ) : (
              <div className="text-center text-muted-foreground">
                {isGenerating ? (
                  <div className="space-y-2">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    <p>Generating your image...</p>
                  </div>
                ) : (
                  <p>Generated images will appear here</p>
                )}
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};