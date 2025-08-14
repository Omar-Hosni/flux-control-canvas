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
import { Input } from '@/components/ui/input';
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
  const [activeTab, setActiveTab] = useState<string>("texttoimage");
  
  // Merger states
  const [mergerImages, setMergerImages] = useState<File[]>([]);
  const [mergerPrompt, setMergerPrompt] = useState<string>("");
  const [mergerImageWeights, setMergerImageWeights] = useState<number[]>([]);
  
  // ControlNet states
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [selectedPreprocessor, setSelectedPreprocessor] = useState<string | null>(null);
  const [preprocessedImage, setPreprocessedImage] = useState<PreprocessedImage | null>(null);
  
  // Image-to-Image states
  const [img2imgImage, setImg2imgImage] = useState<File | null>(null);
  const [img2imgStrength, setImg2imgStrength] = useState<number>(0.8);
  const [img2imgSteps, setImg2imgSteps] = useState<number>(30);
  const [img2imgPrompt, setImg2imgPrompt] = useState<string>("");
  const [img2imgWidth, setImg2imgWidth] = useState<number>(1024);
  const [img2imgHeight, setImg2imgHeight] = useState<number>(1024);
  const [img2imgCfgScale, setImg2imgCfgScale] = useState<number>(3.5);
  
  // Tools states
  const [toolImage, setToolImage] = useState<File | null>(null);
  const [toolType, setToolType] = useState<string>("removebg");
  const [upscaleFactor, setUpscaleFactor] = useState<number>(2);
  const [maskImage, setMaskImage] = useState<File | null>(null);
  const [inpaintPrompt, setInpaintPrompt] = useState<string>("");
  const [outpaintDirection, setOutpaintDirection] = useState<'up' | 'down' | 'left' | 'right' | 'all'>('all');
  const [outpaintAmount, setOutpaintAmount] = useState<number>(50);
  const [outpaintPrompt, setOutpaintPrompt] = useState<string>("");
  
  // Flux Kontext states
  const [fluxImage, setFluxImage] = useState<File | null>(null);
  const [fluxImage2, setFluxImage2] = useState<File | null>(null); // For re-scene (scene image)
  const [fluxImages, setFluxImages] = useState<File[]>([]); // For re-mix (multiple images)
  const [fluxType, setFluxType] = useState<string>("reference");
  const [fluxPrompt, setFluxPrompt] = useState<string>("");
  const [referenceType, setReferenceType] = useState<string>("style");
  const [creativity, setCreativity] = useState<number>(0.8);
  const [fluxKontextPro, setFluxKontextPro] = useState<boolean>(false);
  const [sizeRatio, setSizeRatio] = useState<string>("1:1");
  
  // Flux Kontext LoRA states
  interface FluxLoRA {
    name: string;
    model: string;
    customModel?: string;
    weight: number;
  }
  const [fluxSelectedLoras, setFluxSelectedLoras] = useState<FluxLoRA[]>([]);

  const AVAILABLE_LORAS = [
    { name: 'None', model: 'none', weight: 1 },
    { name: 'Amateur Photography', model: 'civitai:652699@993999', weight: 1 },
    { name: 'Detail Tweaker', model: 'civitai:58390@62833', weight: 1 },
    { name: 'Realistic', model: 'civitai:796382@1026423', weight: 1 },
    { name: 'Custom AIR Code', model: 'custom', weight: 1 },
  ];
  
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

  const getBuiltInPrompt = (type: string) => {
    switch (type) {
      case 'reference': return `Apply ${referenceType} reference transformation`;
      case 'reimagine': return 'Reimagine this image with creative variations';
      case 'rescene': return 'Blend this object into this scene while maintaining all details and realistic lighting';
      case 'reangle': return 'Change camera angle of this image by 15 degrees to right direction';
      case 'remix': return 'Creatively blend and remix these images into a cohesive composition';
      default: return 'Transform this image';
    }
  };

  // Flux LoRA handlers
  const handleFluxAddLora = () => {
    if (fluxSelectedLoras.length < 4) { // Limit to 4 LoRAs
      setFluxSelectedLoras([...fluxSelectedLoras, { name: 'Amateur Photography', model: 'civitai:652699@993999', weight: 1 }]);
    }
  };

  const handleFluxRemoveLora = (index: number) => {
    setFluxSelectedLoras(fluxSelectedLoras.filter((_, i) => i !== index));
  };

  const handleFluxLoraChange = (index: number, field: string, value: any) => {
    const updatedLoras = [...fluxSelectedLoras];
    if (field === 'model') {
      const loraOption = AVAILABLE_LORAS.find(lora => lora.model === value);
      if (loraOption) {
        updatedLoras[index] = { ...updatedLoras[index], name: loraOption.name, model: value, customModel: '' };
      }
    } else {
      updatedLoras[index] = { ...updatedLoras[index], [field]: value };
    }
    setFluxSelectedLoras(updatedLoras);
  };

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
      setIsGenerating(false); // Reset state immediately on error
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
      // Upload the seed image first - use uploadImageForURL for img2img
      const uploadedImageUrl = await runwareService.uploadImageForURL(img2imgImage);
      
      // Use seedImage parameter for image-to-image generation
      const result = await runwareService.generateImage({
        positivePrompt: img2imgPrompt,
        seedImage: uploadedImageUrl, // Uploaded image as seed
        strength: img2imgStrength, // Strength parameter
        model: 'runware:101@1',
        numberResults: 1,
        outputFormat: 'WEBP',
        width: img2imgWidth,
        height: img2imgHeight,
        CFGScale: img2imgCfgScale,
        steps: img2imgSteps
      });

      
      setGeneratedImages(prev => [result, ...prev]);
      toast.success('Image generated successfully!');
    } catch (error) {
      console.error('Generation failed:', error);
      toast.error('Failed to generate image. Please try again.');
      setIsGenerating(false); // Reset state immediately on error
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
      // For upscaling, use UUID upload; for other tools, use URL upload
      let uploadedImageId;
      if (toolType === 'upscale') {
        uploadedImageId = await runwareService.uploadImage(toolImage); // Returns UUID
      } else {
        uploadedImageId = await runwareService.uploadImageForURL(toolImage); // Returns URL
      }
      let result;

      switch (toolType) {
        case 'removebg':
          result = await runwareService.removeBackground({ inputImage: uploadedImageId });
          break;
        case 'upscale':
          result = await runwareService.upscaleImage({ 
            inputImage: uploadedImageId, // This is now a UUID
            upscaleFactor: upscaleFactor as 2 | 3 | 4
          });
          break;
        case 'inpaint':
          if (!maskImage || !inpaintPrompt) {
            toast.error('Please provide mask image and prompt for inpainting');
            return;
          }
          const uploadedMaskUrl = await runwareService.uploadImageForURL(maskImage);
          result = await runwareService.inpaintImage({
            seedImage: uploadedImageId, // This is a URL
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
            inputImage: uploadedImageId, // This is a URL
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

  // Merger generation function
  const handleMergerGenerate = async () => {
    if (!runwareService || mergerImages.length === 0 || !mergerPrompt) {
      toast.error('Please select images and enter a prompt');
      return;
    }

    setIsGenerating(true);
    try {
      // Upload all images and get their URLs
      const uploadedImageUrls: string[] = [];
      
      for (let i = 0; i < mergerImages.length; i++) {
        console.log(`Uploading image ${i + 1}/${mergerImages.length}...`);
        const url = await runwareService.uploadImageForURL(mergerImages[i]);
        uploadedImageUrls.push(url);
        // Add small delay between uploads to prevent conflicts
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      // Create ipAdapters array with the uploaded images and weights
      const ipAdapters = uploadedImageUrls.map((url, index) => ({
        model: "runware:105@1", // Correct AIR identifier for IP adapters
        guideImage: url,
        weight: mergerImageWeights[index] || 1.0
      }));

      // Generate with ipAdapters
      const result = await runwareService.generateImage({
        positivePrompt: mergerPrompt,
        model: 'runware:101@1',
        width: 1024,
        height: 1024,
        numberResults: 1,
        outputFormat: 'WEBP',
        ipAdapters
      });

      setGeneratedImages(prev => [result, ...prev]);
      toast.success('Image generated successfully!');
    } catch (error) {
      console.error('Generation failed:', error);
      toast.error('Failed to generate image. Please try again.');
      setIsGenerating(false); // Reset state immediately on error
    } finally {
      setIsGenerating(false);
    }
  };

  // Helper function to get dimensions based on ratio
  const getDimensionsFromRatio = (ratio: string) => {
    const ratioMap = {
      "1:1": { width: 1024, height: 1024 },
      "21:9": { width: 1568, height: 672 },
      "16:9": { width: 1456, height: 816 },
      "4:3": { width: 1216, height: 912 },
      "3:2": { width: 1344, height: 896 }
    };
    return ratioMap[ratio as keyof typeof ratioMap] || { width: 1024, height: 1024 };
  };

  // Flux Kontext generation
  const handleFluxGenerate = async () => {
    if (!runwareService) {
      toast.error('Service not initialized');
      return;
    }

    // Validate required images based on transformation type
    if (fluxType === 'rescene' && (!fluxImage || !fluxImage2)) {
      toast.error('Re-scene requires both object and scene images');
      return;
    }
    if (fluxType === 'remix' && fluxImages.length < 2) {
      toast.error('Re-mix requires at least 2 images');
      return;
    }
    if (!fluxImage && fluxType !== 'remix') {
      toast.error('Please select an image');
      return;
    }

    setIsGenerating(true);
    try {
      let result;
      const transformationType = fluxType;
      
      // Use custom prompt if provided, otherwise use built-in prompts
      const finalPrompt = fluxPrompt.trim() || getBuiltInPrompt(transformationType);

      // Build LoRA array for API
      const loraArray = fluxSelectedLoras
        .filter(lora => lora.model !== 'none') // Exclude "None" selections
        .map(lora => ({
          model: lora.model === 'custom' ? lora.customModel || '' : lora.model,
          weight: lora.weight
        }))
        .filter(lora => lora.model.trim() !== ''); // Remove empty custom models

      switch (transformationType) {
        case 'reference':
        case 'reimagine':
        case 'reangle':
          // Single image operations
          const uploadedImageUrl = await runwareService.uploadImageForURL(fluxImage!);
          if (transformationType === 'reference') {
            result = await runwareService.generateReference(
              uploadedImageUrl,
              finalPrompt,
              referenceType,
              fluxKontextPro,
              fluxKontextPro ? sizeRatio : undefined,
              loraArray.length > 0 ? loraArray : undefined
            );
          } else if (transformationType === 'reimagine') {
            result = await runwareService.generateReImagine(
              uploadedImageUrl,
              finalPrompt,
              fluxKontextPro,
              fluxKontextPro ? sizeRatio : undefined,
              creativity,
              loraArray.length > 0 ? loraArray : undefined
            );
          } else if (transformationType === 'reangle') {
            result = await runwareService.generateReAngle(
              uploadedImageUrl,
              15, // default degrees
              'right', // default direction
              fluxKontextPro,
              fluxKontextPro ? sizeRatio : undefined,
              loraArray.length > 0 ? loraArray : undefined
            );
          }
          break;

        case 'rescene':
          // Two image operation - upload images sequentially to avoid conflicts
          console.log('Uploading object image...');
          const objectImageUrl = await runwareService.uploadImageForURL(fluxImage!);
          console.log('Object image uploaded:', objectImageUrl);
          
          console.log('Uploading scene image...');
          const sceneImageUrl = await runwareService.uploadImageForURL(fluxImage2!);
          console.log('Scene image uploaded:', sceneImageUrl);
          
          result = await runwareService.generateReScene(
            objectImageUrl,
            sceneImageUrl,
            fluxKontextPro,
            fluxKontextPro ? sizeRatio : undefined,
            loraArray.length > 0 ? loraArray : undefined
          );
          break;

        case 'remix':
          // Multiple image operation - upload images sequentially to avoid conflicts
          console.log(`Uploading ${fluxImages.length} images for remix...`);
          const uploadedImageUrls: string[] = [];
          
          for (let i = 0; i < fluxImages.length; i++) {
            console.log(`Uploading image ${i + 1}/${fluxImages.length}...`);
            const url = await runwareService.uploadImageForURL(fluxImages[i]);
            console.log(`Image ${i + 1} uploaded:`, url);
            uploadedImageUrls.push(url);
            // Add small delay between uploads to prevent conflicts
            await new Promise(resolve => setTimeout(resolve, 200));
          }
          
          result = await runwareService.generateReMix(
            uploadedImageUrls,
            fluxKontextPro,
            fluxKontextPro ? sizeRatio : undefined,
            loraArray.length > 0 ? loraArray : undefined
          );
          break;

        default:
          throw new Error('Unsupported transformation type');
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
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="texttoimage" className="gap-2">
              <Zap className="w-4 h-4" />
              Text-to-Image
            </TabsTrigger>
            <TabsTrigger value="img2img" className="gap-2">
              <ImageIcon className="w-4 h-4" />
              Image-to-Image
            </TabsTrigger>
            <TabsTrigger value="merger" className="gap-2">
              <Palette className="w-4 h-4" />
              Merger (Re-mix)
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
          {/* Text-to-Image Tab */}
          <TabsContent value="texttoimage">
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
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium">
                          Width: {img2imgWidth}px
                        </Label>
                        <Slider
                          value={[img2imgWidth]}
                          onValueChange={(value) => setImg2imgWidth(value[0])}
                          min={512}
                          max={1536}
                          step={64}
                          className="mt-2"
                        />
                      </div>
                      <div>
                        <Label className="text-sm font-medium">
                          Height: {img2imgHeight}px
                        </Label>
                        <Slider
                          value={[img2imgHeight]}
                          onValueChange={(value) => setImg2imgHeight(value[0])}
                          min={512}
                          max={1536}
                          step={64}
                          className="mt-2"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <Label className="text-sm font-medium">
                        CFG Scale: {img2imgCfgScale}
                      </Label>
                      <p className="text-xs text-muted-foreground mb-2">
                        Controls adherence to prompt (higher = more strict)
                      </p>
                      <Slider
                        value={[img2imgCfgScale]}
                        onValueChange={(value) => setImg2imgCfgScale(value[0])}
                        min={1}
                        max={20}
                        step={0.5}
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

          {/* Merger Tab */}
          <TabsContent value="merger">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-1">
                <Card className="p-6 bg-ai-surface border-border shadow-card">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 rounded-lg bg-gradient-primary">
                      <Palette className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-foreground">
                        Merger (Re-mix)
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        Merge multiple images using ipAdapters
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium">Upload Images (Multiple)</Label>
                      <Button
                        variant="outline"
                        className="w-full h-32 border-dashed"
                        onClick={() => document.getElementById('merger-input')?.click()}
                      >
                        <Upload className="w-6 h-6 mr-2" />
                        {mergerImages.length > 0 ? `${mergerImages.length} images selected` : 'Choose Multiple Images'}
                      </Button>
                      <input
                        id="merger-input"
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={(e) => {
                          const files = Array.from(e.target.files || []);
                          setMergerImages(files);
                          // Initialize weights array with default values
                          setMergerImageWeights(files.map(() => 1.0));
                        }}
                        className="hidden"
                      />
                    </div>
                    
                    {mergerImages.length > 0 && (
                      <div className="grid grid-cols-2 gap-2">
                        {mergerImages.slice(0, 4).map((img, index) => (
                          <div key={index} className="border rounded-lg overflow-hidden relative">
                            <img
                              src={URL.createObjectURL(img)}
                              alt={`Input ${index + 1}`}
                              className="w-full h-24 object-cover"
                            />
                            <div className="absolute top-1 right-1 bg-black bg-opacity-50 text-white text-xs px-1 rounded">
                              {index + 1}
                            </div>
                          </div>
                        ))}
                        {mergerImages.length > 4 && (
                          <div className="border rounded-lg flex items-center justify-center bg-gray-100">
                            <span className="text-sm text-gray-600">+{mergerImages.length - 4} more</span>
                          </div>
                        )}
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
                        Merger Settings
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        Configure merging parameters
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium">Prompt</Label>
                      <Textarea
                        value={mergerPrompt}
                        onChange={(e) => setMergerPrompt(e.target.value)}
                        placeholder="Describe how to merge the images..."
                        className="h-24"
                      />
                    </div>
                    
                    {mergerImages.length > 0 && (
                      <div>
                        <Label className="text-sm font-medium">Image Weights</Label>
                        <p className="text-xs text-muted-foreground mb-2">
                          Adjust the influence of each image (0.0 - 2.0)
                        </p>
                        <div className="space-y-3">
                          {mergerImages.map((img, index) => (
                            <div key={index} className="flex items-center gap-3">
                              <span className="text-sm font-medium w-16">
                                Image {index + 1}:
                              </span>
                              <Slider
                                value={[mergerImageWeights[index] || 1.0]}
                                onValueChange={(value) => {
                                  const newWeights = [...mergerImageWeights];
                                  newWeights[index] = value[0];
                                  setMergerImageWeights(newWeights);
                                }}
                                min={0}
                                max={2}
                                step={0.1}
                                className="flex-1"
                              />
                              <span className="text-sm text-muted-foreground w-8">
                                {(mergerImageWeights[index] || 1.0).toFixed(1)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <Button
                      onClick={handleMergerGenerate}
                      disabled={mergerImages.length === 0 || !mergerPrompt || isGenerating}
                      className="w-full"
                    >
                      {isGenerating ? 'Generating...' : 'Generate Merged Image'}
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
                               <SelectItem value="3">3x</SelectItem>
                               <SelectItem value="4">4x</SelectItem>
                             </SelectContent>
                          </Select>
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
                    {/* Primary Image Upload */}
                    <div>
                      <Label className="text-sm font-medium">
                        {fluxType === 'rescene' ? 'Object Image' : fluxType === 'remix' ? 'Images (Multiple)' : 'Upload Image'}
                      </Label>
                      <Button
                        variant="outline"
                        className="w-full h-32 border-dashed"
                        onClick={() => {
                          if (fluxType === 'remix') {
                            document.getElementById('flux-multiple-input')?.click();
                          } else {
                            document.getElementById('flux-input')?.click();
                          }
                        }}
                      >
                        <Upload className="w-6 h-6 mr-2" />
                        {fluxType === 'remix' 
                          ? (fluxImages.length > 0 ? `${fluxImages.length} images selected` : 'Choose Multiple Images')
                          : (fluxImage ? fluxImage.name : 'Choose Image')
                        }
                      </Button>
                      
                      {/* Single image input */}
                      <input
                        id="flux-input"
                        type="file"
                        accept="image/*"
                        onChange={(e) => setFluxImage(e.target.files?.[0] || null)}
                        className="hidden"
                      />
                      
                      {/* Multiple images input */}
                      <input
                        id="flux-multiple-input"
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={(e) => {
                          const files = Array.from(e.target.files || []);
                          setFluxImages(files);
                        }}
                        className="hidden"
                      />
                    </div>

                    {/* Second Image for Re-scene */}
                    {fluxType === 'rescene' && (
                      <div>
                        <Label className="text-sm font-medium">Scene Image</Label>
                        <Button
                          variant="outline"
                          className="w-full h-32 border-dashed"
                          onClick={() => document.getElementById('flux-scene-input')?.click()}
                        >
                          <Upload className="w-6 h-6 mr-2" />
                          {fluxImage2 ? fluxImage2.name : 'Choose Scene Image'}
                        </Button>
                        <input
                          id="flux-scene-input"
                          type="file"
                          accept="image/*"
                          onChange={(e) => setFluxImage2(e.target.files?.[0] || null)}
                          className="hidden"
                        />
                      </div>
                    )}
                    
                    {/* Image Previews */}
                    {fluxType === 'remix' && fluxImages.length > 0 && (
                      <div className="grid grid-cols-2 gap-2">
                        {fluxImages.slice(0, 4).map((img, index) => (
                          <div key={index} className="border rounded-lg overflow-hidden relative">
                            <img
                              src={URL.createObjectURL(img)}
                              alt={`Input ${index + 1}`}
                              className="w-full h-24 object-cover"
                            />
                            <div className="absolute top-1 right-1 bg-black bg-opacity-50 text-white text-xs px-1 rounded">
                              {index + 1}
                            </div>
                          </div>
                        ))}
                        {fluxImages.length > 4 && (
                          <div className="border rounded-lg flex items-center justify-center bg-gray-100">
                            <span className="text-sm text-gray-600">+{fluxImages.length - 4} more</span>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {fluxType !== 'remix' && fluxImage && (
                      <div className="border rounded-lg overflow-hidden">
                        <img
                          src={URL.createObjectURL(fluxImage)}
                          alt="Input"
                          className="w-full h-48 object-cover"
                        />
                      </div>
                    )}

                    {fluxType === 'rescene' && fluxImage2 && (
                      <div className="border rounded-lg overflow-hidden">
                        <img
                          src={URL.createObjectURL(fluxImage2)}
                          alt="Scene"
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
                       <Label className="text-sm font-medium flex items-center gap-2">
                         Flux Kontext Pro
                         <input
                           type="checkbox"
                           checked={fluxKontextPro}
                           onChange={(e) => setFluxKontextPro(e.target.checked)}
                           className="w-4 h-4 rounded border-border"
                         />
                       </Label>
                       <p className="text-xs text-muted-foreground">
                         Use advanced model with size ratio control
                       </p>
                     </div>

                      {fluxKontextPro ? (
                        <div>
                          <Label className="text-sm font-medium">Size Ratio</Label>
                          <Select value={sizeRatio} onValueChange={setSizeRatio}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="1:1">1:1 (1024×1024)</SelectItem>
                              <SelectItem value="21:9">21:9 (1568×672)</SelectItem>
                              <SelectItem value="16:9">16:9 (1456×816)</SelectItem>
                              <SelectItem value="4:3">4:3 (1216×912)</SelectItem>
                              <SelectItem value="3:2">3:2 (1344×896)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      ) : (
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
                             </SelectContent>
                          </Select>
                        </div>
                      )}

                      {/* Show transformation types for Kontext Pro too */}
                      {fluxKontextPro && (
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
                             </SelectContent>
                          </Select>
                        </div>
                      )}
                    
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
                       <Label className="text-sm font-medium">Prompt (Optional)</Label>
                       <Textarea
                         value={fluxPrompt}
                         onChange={(e) => setFluxPrompt(e.target.value)}
                         placeholder={`Leave empty to use built-in prompt for ${fluxType}...`}
                         className="h-24"
                       />
                       <p className="text-xs text-muted-foreground mt-1">
                         Built-in prompt: "{getBuiltInPrompt(fluxType)}"
                       </p>
                     </div>

                     {/* LoRA Selection */}
                     <div className="space-y-3 p-4 bg-ai-surface-elevated rounded-lg border border-border">
                       <div className="flex items-center justify-between">
                         <div className="flex items-center gap-2">
                           <Palette className="w-4 h-4 text-primary" />
                           <Label className="text-sm font-medium">LoRA Models</Label>
                         </div>
                         <Button 
                           variant="outline" 
                           size="sm" 
                           onClick={handleFluxAddLora}
                           disabled={fluxSelectedLoras.length >= 4}
                         >
                           Add LoRA
                         </Button>
                       </div>
                       
                       {fluxSelectedLoras.length === 0 ? (
                         <p className="text-xs text-muted-foreground">No LoRAs selected</p>
                       ) : (
                          <div className="space-y-3">
                            {fluxSelectedLoras.map((lora, index) => (
                              <div key={index} className="space-y-2">
                                <div className="flex items-center gap-3 p-3 bg-ai-surface rounded border">
                                  <div className="flex-1">
                                    <Select 
                                      value={lora.model} 
                                      onValueChange={(value) => handleFluxLoraChange(index, 'model', value)}
                                    >
                                      <SelectTrigger className="h-8">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {AVAILABLE_LORAS.map((availableLora) => (
                                          <SelectItem key={availableLora.model} value={availableLora.model}>
                                            {availableLora.name}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="w-20">
                                    <Input
                                      type="number"
                                      min="0"
                                      max="2"
                                      step="0.1"
                                      value={lora.weight}
                                      onChange={(e) => handleFluxLoraChange(index, 'weight', parseFloat(e.target.value) || 1)}
                                      className="h-8 text-center"
                                    />
                                  </div>
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={() => handleFluxRemoveLora(index)}
                                    className="h-8 w-8 p-0"
                                  >
                                    ×
                                  </Button>
                                </div>
                                {lora.model === 'custom' && (
                                  <div className="px-3">
                                    <Textarea
                                      placeholder="Paste LoRA AIR code here (e.g., civitai:123@1)"
                                      value={lora.customModel || ''}
                                      onChange={(e) => handleFluxLoraChange(index, 'customModel', e.target.value)}
                                      className="h-16 text-xs resize-none"
                                    />
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                       )}
                     </div>
                    
                    <Button
                      onClick={handleFluxGenerate}
                      disabled={
                        isGenerating || 
                        (fluxType === 'rescene' && (!fluxImage || !fluxImage2)) ||
                        (fluxType === 'remix' && fluxImages.length < 2) ||
                        (fluxType !== 'remix' && fluxType !== 'rescene' && !fluxImage)
                      }
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
