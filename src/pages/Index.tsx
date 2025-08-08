import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { ImageUpload } from '@/components/ImageUpload';
import { ControlNetSelector } from '@/components/ControlNetSelector';
import { PreprocessPreview } from '@/components/PreprocessPreview';
import { GenerationSettings } from '@/components/GenerationSettings';
import { ResultsGallery } from '@/components/ResultsGallery';
import { ApiKeySetup } from '@/components/ApiKeySetup';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Brain, Zap, Settings, Workflow, Image as ImageIcon, Wand2, Palette, Upload } from 'lucide-react';
import { Link } from 'react-router-dom';
import { 
  RunwareService, 
  type PreprocessedImage, 
  type GeneratedImage, 
  type GenerateImageParams,
  type ImageToImageParams,
  type FluxKontextParams
} from '@/services/RunwareService';

const Index = () => {
  const [apiKey, setApiKey] = useState<string | null>("J9GGKxXu8hDhbW1mXOPaNHBH8S48QnhT");
  const [runwareService, setRunwareService] = useState<RunwareService | null>(null);
  const [activeTab, setActiveTab] = useState<string>("controlnet");
  
  // ControlNet states
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [selectedPreprocessor, setSelectedPreprocessor] = useState<string | null>(null);
  const [preprocessedImage, setPreprocessedImage] = useState<PreprocessedImage | null>(null);
  
  // Image-to-Image states
  const [img2imgImage, setImg2imgImage] = useState<File | null>(null);
  const [img2imgStrength, setImg2imgStrength] = useState<number>(0.8);
  const [img2imgSteps, setImg2imgSteps] = useState<number>(30);
  const [img2imgPrompt, setImg2imgPrompt] = useState<string>("");
  
  // Tools states
  const [toolImage, setToolImage] = useState<File | null>(null);
  const [toolType, setToolType] = useState<string>("removebg");
  const [upscaleFactor, setUpscaleFactor] = useState<number>(2);
  const [upscaleWidth, setUpscaleWidth] = useState<number>(1024);
  const [upscaleHeight, setUpscaleHeight] = useState<number>(1024);
  const [maskImage, setMaskImage] = useState<File | null>(null);
  const [inpaintPrompt, setInpaintPrompt] = useState<string>("");
  const [outpaintDirection, setOutpaintDirection] = useState<'up' | 'down' | 'left' | 'right' | 'all'>('all');
  const [outpaintAmount, setOutpaintAmount] = useState<number>(50);
  const [outpaintPrompt, setOutpaintPrompt] = useState<string>("");
  
  // Flux Kontext states
  const [fluxImage, setFluxImage] = useState<File | null>(null);
  const [fluxType, setFluxType] = useState<string>("reference");
  const [fluxPrompt, setFluxPrompt] = useState<string>("");
  const [referenceType, setReferenceType] = useState<string>("style");
  const [creativity, setCreativity] = useState<number>(0.8);
  
  // Common states
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (apiKey) {
      console.log('Creating RunwareService with API key');
      setRunwareService(new RunwareService(apiKey));
    }
  }, [apiKey]);

  const handleApiKeySet = (key: string) => {
    setApiKey(key);
    localStorage.setItem('runware_api_key', key);
    setRunwareService(new RunwareService(key));
  };

  const handleImageSelect = (file: File) => {
    console.log('Image selected:', file.name);
    setSelectedImage(file);
    setPreprocessedImage(null);
    // Don't clear preprocessor selection when new image is selected
    // setSelectedPreprocessor(null);
  };

  const handlePreprocess = async () => {
    console.log('Preprocessing attempt:', { 
      hasImage: !!selectedImage, 
      preprocessor: selectedPreprocessor, 
      hasService: !!runwareService 
    });
    
    if (!selectedImage || !selectedPreprocessor || !runwareService) {
      toast.error('Please select an image and preprocessor');
      return;
    }

    setIsProcessing(true);
    try {
      const result = await runwareService.preprocessImage(selectedImage, selectedPreprocessor);
      setPreprocessedImage(result);
      toast.success('Image preprocessed successfully!');
    } catch (error) {
      console.error('Preprocessing failed:', error);
      toast.error('Failed to preprocess image. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGenerate = async (params: GenerateImageParams) => {
    if (!preprocessedImage || !runwareService) {
      toast.error('Please preprocess an image first');
      return;
    }

    setIsGenerating(true);
    try {
      // Add the preprocessed image as controlNet guide
      const enhancedParams = {
        ...params,
        controlNet: [{
          model: 'runware:29@1',
          guideImage: preprocessedImage.imageURL,
          weight: 1,
          startStep: 0,
          endStep: 28,
          controlMode: 'balanced' as const
        }]
      };

      const result = await runwareService.generateImage(enhancedParams);
      setGeneratedImages(prev => [result, ...prev]);
      toast.success('Image generated successfully!');
    } catch (error) {
      console.error('Generation failed:', error);
      toast.error('Failed to generate image. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Image-to-Image generation
  const handleImg2ImgGenerate = async () => {
    if (!img2imgImage || !img2imgPrompt || !runwareService) {
      toast.error('Please select an image and enter a prompt');
      return;
    }

    setIsGenerating(true);
    try {
      // Upload the seed image first
      const uploadedImageUrl = await runwareService.uploadImage(img2imgImage);
      
      const params: GenerateImageParams = {
        positivePrompt: img2imgPrompt,
        seedImage: uploadedImageUrl, // Use as seed image parameter
        noise: img2imgStrength, // Creativity slider controls noise
        model: 'runware:101@1',
        numberResults: 1,
        outputFormat: 'WEBP',
        width: 1024,
        height: 1024,
        steps: img2imgSteps
      };

      const result = await runwareService.generateImage(params);
      setGeneratedImages(prev => [result, ...prev]);
      toast.success('Image generated successfully!');
    } catch (error) {
      console.error('Generation failed:', error);
      toast.error('Failed to generate image. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Tools processing
  const handleToolProcess = async () => {
    if (!toolImage || !runwareService) {
      toast.error('Please select an image');
      return;
    }

    setIsProcessing(true);
    try {
      // Upload the image first to get UUID
      const uploadedImageUrl = await runwareService.uploadImage(toolImage);
      let result;

      switch (toolType) {
        case 'removebg':
          result = await runwareService.removeBackground({ inputImage: uploadedImageUrl });
          break;
        case 'upscale':
          result = await runwareService.upscaleImage({ 
            inputImage: uploadedImageUrl, 
            upscaleFactor,
            width: upscaleWidth,
            height: upscaleHeight
          });
          break;
        case 'inpaint':
          if (!maskImage || !inpaintPrompt) {
            toast.error('Please provide mask image and prompt for inpainting');
            return;
          }
          const uploadedMaskUrl = await runwareService.uploadImage(maskImage);
          result = await runwareService.inpaintImage({
            seedImage: uploadedImageUrl, // Use seedImage instead of inputImage
            maskImage: uploadedMaskUrl,
            positivePrompt: inpaintPrompt
          });
          break;
        case 'outpaint':
          if (!outpaintPrompt) {
            toast.error('Please provide a prompt for outpainting');
            return;
          }
          result = await runwareService.outpaintImage({
            inputImage: uploadedImageUrl,
            positivePrompt: outpaintPrompt,
            outpaintDirection,
            outpaintAmount
          });
          break;
        default:
          throw new Error('Unsupported tool type');
      }

      setGeneratedImages(prev => [result, ...prev]);
      toast.success('Image processed successfully!');
    } catch (error) {
      console.error('Processing failed:', error);
      toast.error('Failed to process image. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Flux Kontext generation
  const handleFluxGenerate = async () => {
    if (!fluxImage || !fluxPrompt || !runwareService) {
      toast.error('Please select an image and enter a prompt');
      return;
    }

    setIsGenerating(true);
    try {
      const imageUrl = URL.createObjectURL(fluxImage);
      let result;

      switch (fluxType) {
        case 'reference':
          result = await runwareService.generateReference(
            imageUrl,
            fluxPrompt,
            referenceType
          );
          break;
        case 'reimagine':
          result = await runwareService.generateImageToImage({
            positivePrompt: fluxPrompt,
            inputImage: imageUrl,
            strength: creativity
          });
          break;
        default:
          result = await runwareService.generateFluxKontext({
            inputImages: [imageUrl],
            positivePrompt: fluxPrompt,
            model: 'runware:100@1'
          });
      }

      setGeneratedImages(prev => [result, ...prev]);
      toast.success('Image generated successfully!');
    } catch (error) {
      console.error('Generation failed:', error);
      toast.error('Failed to generate image. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  if (!apiKey) {
    return <ApiKeySetup onApiKeySet={handleApiKeySet} />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-ai-surface">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-lg bg-gradient-primary">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  Runware AI Studio
                </h1>
                <p className="text-muted-foreground">
                  Complete AI image generation and editing suite
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Link to="/workflow">
                <Button variant="outline" className="gap-2">
                  <Workflow className="w-4 h-4" />
                  Workflow Editor
                </Button>
              </Link>
              <Badge variant="secondary" className="gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                Connected
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="controlnet" className="gap-2">
              <Zap className="w-4 h-4" />
              ControlNet
            </TabsTrigger>
            <TabsTrigger value="img2img" className="gap-2">
              <ImageIcon className="w-4 h-4" />
              Image-to-Image
            </TabsTrigger>
            <TabsTrigger value="tools" className="gap-2">
              <Wand2 className="w-4 h-4" />
              Tools
            </TabsTrigger>
            <TabsTrigger value="flux" className="gap-2">
              <Palette className="w-4 h-4" />
              Flux Kontext
            </TabsTrigger>
          </TabsList>
          {/* ControlNet Tab */}
          <TabsContent value="controlnet">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Column - Upload & Preprocessing */}
              <div className="lg:col-span-1 space-y-6">
                <Card className="p-6 bg-ai-surface border-border shadow-card">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 rounded-lg bg-gradient-primary">
                      <Zap className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-foreground">
                        Input & Processing
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        Upload and preprocess your control image
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-6">
                    <ImageUpload
                      onImageSelect={handleImageSelect}
                      selectedImage={selectedImage}
                    />
                    
                    <Separator className="bg-border" />
                    
                    <ControlNetSelector
                      selectedPreprocessor={selectedPreprocessor}
                      onPreprocessorSelect={setSelectedPreprocessor}
                      onPreprocess={handlePreprocess}
                      isProcessing={isProcessing}
                      disabled={!selectedImage}
                    />
                  </div>
                </Card>

                {preprocessedImage && (
                  <PreprocessPreview
                    preprocessedImage={preprocessedImage}
                    originalImage={selectedImage}
                  />
                )}
              </div>

              {/* Middle Column - Generation Settings */}
              <div className="lg:col-span-1">
                <GenerationSettings
                  onGenerate={handleGenerate}
                  isGenerating={isGenerating}
                  hasPreprocessedImage={!!preprocessedImage}
                  preprocessedImageUrl={preprocessedImage?.imageURL}
                />
              </div>

              {/* Right Column - Results */}
              <div className="lg:col-span-1">
                <ResultsGallery
                  results={generatedImages}
                  isGenerating={isGenerating}
                />
              </div>
            </div>
          </TabsContent>

          {/* Image-to-Image Tab */}
          <TabsContent value="img2img">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-1">
                <Card className="p-6 bg-ai-surface border-border shadow-card">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 rounded-lg bg-gradient-primary">
                      <ImageIcon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-foreground">
                        Image Input
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        Upload base image to transform
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium">Upload Image</Label>
                      <Button
                        variant="outline"
                        className="w-full h-32 border-dashed"
                        onClick={() => document.getElementById('img2img-input')?.click()}
                      >
                        <Upload className="w-6 h-6 mr-2" />
                        {img2imgImage ? img2imgImage.name : 'Choose Image'}
                      </Button>
                      <input
                        id="img2img-input"
                        type="file"
                        accept="image/*"
                        onChange={(e) => setImg2imgImage(e.target.files?.[0] || null)}
                        className="hidden"
                      />
                    </div>
                    
                    {img2imgImage && (
                      <div className="border rounded-lg overflow-hidden">
                        <img
                          src={URL.createObjectURL(img2imgImage)}
                          alt="Input"
                          className="w-full h-48 object-cover"
                        />
                      </div>
                    )}
                  </div>
                </Card>
              </div>

              <div className="lg:col-span-1">
                <Card className="p-6 bg-ai-surface border-border shadow-card">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 rounded-lg bg-gradient-primary">
                      <Settings className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-foreground">
                        Settings
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        Configure transformation parameters
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium">Prompt</Label>
                      <Textarea
                        value={img2imgPrompt}
                        onChange={(e) => setImg2imgPrompt(e.target.value)}
                        placeholder="Describe the transformation..."
                        className="h-24"
                      />
                    </div>
                    
                    <div>
                      <Label className="text-sm font-medium">
                        Creativity: {(img2imgStrength * 100).toFixed(0)}%
                      </Label>
                      <p className="text-xs text-muted-foreground mb-2">
                        Higher values allow more creative deviation from the seed image
                      </p>
                      <Slider
                        value={[img2imgStrength]}
                        onValueChange={(value) => setImg2imgStrength(value[0])}
                        max={1}
                        min={0}
                        step={0.1}
                        className="mt-2"
                      />
                    </div>
                    
                    <div>
                      <Label className="text-sm font-medium">
                        Steps: {img2imgSteps}
                      </Label>
                      <p className="text-xs text-muted-foreground mb-2">
                        Number of generation steps (higher = better quality, slower)
                      </p>
                      <Slider
                        value={[img2imgSteps]}
                        onValueChange={(value) => setImg2imgSteps(value[0])}
                        max={100}
                        min={10}
                        step={5}
                        className="mt-2"
                      />
                    </div>
                    
                    <Button
                      onClick={handleImg2ImgGenerate}
                      disabled={!img2imgImage || !img2imgPrompt || isGenerating}
                      className="w-full"
                    >
                      {isGenerating ? 'Generating...' : 'Generate'}
                    </Button>
                  </div>
                </Card>
              </div>

              <div className="lg:col-span-1">
                <ResultsGallery
                  results={generatedImages}
                  isGenerating={isGenerating}
                />
              </div>
            </div>
          </TabsContent>

          {/* Tools Tab */}
          <TabsContent value="tools">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-1">
                <Card className="p-6 bg-ai-surface border-border shadow-card">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 rounded-lg bg-gradient-primary">
                      <Wand2 className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-foreground">
                        Image Tools
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        Process images with AI tools
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium">Upload Image</Label>
                      <Button
                        variant="outline"
                        className="w-full h-32 border-dashed"
                        onClick={() => document.getElementById('tool-input')?.click()}
                      >
                        <Upload className="w-6 h-6 mr-2" />
                        {toolImage ? toolImage.name : 'Choose Image'}
                      </Button>
                      <input
                        id="tool-input"
                        type="file"
                        accept="image/*"
                        onChange={(e) => setToolImage(e.target.files?.[0] || null)}
                        className="hidden"
                      />
                    </div>
                    
                    {toolImage && (
                      <div className="border rounded-lg overflow-hidden">
                        <img
                          src={URL.createObjectURL(toolImage)}
                          alt="Input"
                          className="w-full h-48 object-cover"
                        />
                      </div>
                    )}
                  </div>
                </Card>
              </div>

              <div className="lg:col-span-1">
                <Card className="p-6 bg-ai-surface border-border shadow-card">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 rounded-lg bg-gradient-primary">
                      <Settings className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-foreground">
                        Tool Settings
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        Configure processing options
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium">Tool Type</Label>
                      <Select value={toolType} onValueChange={setToolType}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="removebg">Remove Background</SelectItem>
                          <SelectItem value="upscale">Upscale Image</SelectItem>
                          <SelectItem value="inpaint">Inpaint</SelectItem>
                          <SelectItem value="outpaint">Outpaint</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {toolType === 'upscale' && (
                      <>
                        <div>
                          <Label className="text-sm font-medium">Scale Factor</Label>
                          <Select 
                            value={String(upscaleFactor)} 
                            onValueChange={(value) => setUpscaleFactor(Number(value))}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="2">2x</SelectItem>
                              <SelectItem value="4">4x</SelectItem>
                              <SelectItem value="8">8x</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-sm font-medium">Width</Label>
                            <input
                              type="number"
                              value={upscaleWidth}
                              onChange={(e) => setUpscaleWidth(Number(e.target.value))}
                              className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
                              min="512"
                              max="4096"
                              step="32"
                            />
                          </div>
                          <div>
                            <Label className="text-sm font-medium">Height</Label>
                            <input
                              type="number"
                              value={upscaleHeight}
                              onChange={(e) => setUpscaleHeight(Number(e.target.value))}
                              className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
                              min="512"
                              max="4096"
                              step="32"
                            />
                          </div>
                        </div>
                      </>
                    )}
                    
                    {toolType === 'inpaint' && (
                      <>
                        <div>
                          <Label className="text-sm font-medium">Mask Image</Label>
                          <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => document.getElementById('mask-input')?.click()}
                          >
                            <Upload className="w-4 h-4 mr-2" />
                            {maskImage ? 'Change Mask' : 'Upload Mask'}
                          </Button>
                          <input
                            id="mask-input"
                            type="file"
                            accept="image/*"
                            onChange={(e) => setMaskImage(e.target.files?.[0] || null)}
                            className="hidden"
                          />
                        </div>
                        
                        <div>
                          <Label className="text-sm font-medium">Inpaint Prompt</Label>
                          <Textarea
                            value={inpaintPrompt}
                            onChange={(e) => setInpaintPrompt(e.target.value)}
                            placeholder="Describe what to fill..."
                            className="h-16"
                          />
                        </div>
                      </>
                    )}
                    
                    {toolType === 'outpaint' && (
                      <>
                        <div>
                          <Label className="text-sm font-medium">Direction</Label>
                          <Select value={outpaintDirection} onValueChange={(value: any) => setOutpaintDirection(value)}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="up">Up</SelectItem>
                              <SelectItem value="down">Down</SelectItem>
                              <SelectItem value="left">Left</SelectItem>
                              <SelectItem value="right">Right</SelectItem>
                              <SelectItem value="all">All Directions</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div>
                          <Label className="text-sm font-medium">
                            Amount: {outpaintAmount}px
                          </Label>
                          <Slider
                            value={[outpaintAmount]}
                            onValueChange={(value) => setOutpaintAmount(value[0])}
                            max={200}
                            min={10}
                            step={10}
                            className="mt-2"
                          />
                        </div>
                        
                        <div>
                          <Label className="text-sm font-medium">Outpaint Prompt</Label>
                          <Textarea
                            value={outpaintPrompt}
                            onChange={(e) => setOutpaintPrompt(e.target.value)}
                            placeholder="Describe what to extend..."
                            className="h-16"
                          />
                        </div>
                      </>
                    )}
                    
                    <Button
                      onClick={handleToolProcess}
                      disabled={!toolImage || isProcessing}
                      className="w-full"
                    >
                      {isProcessing ? 'Processing...' : 'Process Image'}
                    </Button>
                  </div>
                </Card>
              </div>

              <div className="lg:col-span-1">
                <ResultsGallery
                  results={generatedImages}
                  isGenerating={isProcessing}
                />
              </div>
            </div>
          </TabsContent>

          {/* Flux Kontext Tab */}
          <TabsContent value="flux">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-1">
                <Card className="p-6 bg-ai-surface border-border shadow-card">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 rounded-lg bg-gradient-primary">
                      <Palette className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-foreground">
                        Flux Kontext
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        Advanced image transformations
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium">Upload Image</Label>
                      <Button
                        variant="outline"
                        className="w-full h-32 border-dashed"
                        onClick={() => document.getElementById('flux-input')?.click()}
                      >
                        <Upload className="w-6 h-6 mr-2" />
                        {fluxImage ? fluxImage.name : 'Choose Image'}
                      </Button>
                      <input
                        id="flux-input"
                        type="file"
                        accept="image/*"
                        onChange={(e) => setFluxImage(e.target.files?.[0] || null)}
                        className="hidden"
                      />
                    </div>
                    
                    {fluxImage && (
                      <div className="border rounded-lg overflow-hidden">
                        <img
                          src={URL.createObjectURL(fluxImage)}
                          alt="Input"
                          className="w-full h-48 object-cover"
                        />
                      </div>
                    )}
                  </div>
                </Card>
              </div>

              <div className="lg:col-span-1">
                <Card className="p-6 bg-ai-surface border-border shadow-card">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 rounded-lg bg-gradient-primary">
                      <Settings className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-foreground">
                        Flux Settings
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        Configure transformation type
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium">Transformation Type</Label>
                      <Select value={fluxType} onValueChange={setFluxType}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="reference">Reference</SelectItem>
                          <SelectItem value="reimagine">Re-imagine</SelectItem>
                          <SelectItem value="rescene">Re-scene</SelectItem>
                          <SelectItem value="reangle">Re-angle</SelectItem>
                          <SelectItem value="remix">Re-mix</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {fluxType === 'reference' && (
                      <div>
                        <Label className="text-sm font-medium">Reference Type</Label>
                        <Select value={referenceType} onValueChange={setReferenceType}>
                          <SelectTrigger>
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
                    )}
                    
                    {fluxType === 'reimagine' && (
                      <div>
                        <Label className="text-sm font-medium">
                          Creativity: {(creativity * 100).toFixed(0)}%
                        </Label>
                        <Slider
                          value={[creativity]}
                          onValueChange={(value) => setCreativity(value[0])}
                          max={1}
                          min={0}
                          step={0.1}
                          className="mt-2"
                        />
                      </div>
                    )}
                    
                    <div>
                      <Label className="text-sm font-medium">Prompt</Label>
                      <Textarea
                        value={fluxPrompt}
                        onChange={(e) => setFluxPrompt(e.target.value)}
                        placeholder="Describe the transformation..."
                        className="h-24"
                      />
                    </div>
                    
                    <Button
                      onClick={handleFluxGenerate}
                      disabled={!fluxImage || !fluxPrompt || isGenerating}
                      className="w-full"
                    >
                      {isGenerating ? 'Generating...' : 'Generate'}
                    </Button>
                  </div>
                </Card>
              </div>

              <div className="lg:col-span-1">
                <ResultsGallery
                  results={generatedImages}
                  isGenerating={isGenerating}
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;
