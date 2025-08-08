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
import { Brain, Zap, Settings, Workflow } from 'lucide-react';
import { Link } from 'react-router-dom';
import { RunwareService, type PreprocessedImage, type GeneratedImage, type GenerateImageParams } from '@/services/RunwareService';

const Index = () => {
  const [apiKey, setApiKey] = useState<string | null>("J9GGKxXu8hDhbW1mXOPaNHBH8S48QnhT");
  const [runwareService, setRunwareService] = useState<RunwareService | null>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [selectedPreprocessor, setSelectedPreprocessor] = useState<string | null>(null);
  const [preprocessedImage, setPreprocessedImage] = useState<PreprocessedImage | null>(null);
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
                  ControlNet-powered image generation with Flux
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
      </div>
    </div>
  );
};

export default Index;
