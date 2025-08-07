import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Download, Eye, Sparkles, Clock, DollarSign } from 'lucide-react';
import type { GeneratedImage } from '@/services/RunwareService';

interface ResultsGalleryProps {
  results: GeneratedImage[];
  isGenerating: boolean;
}

export const ResultsGallery = ({ results, isGenerating }: ResultsGalleryProps) => {
  const [selectedImage, setSelectedImage] = useState<GeneratedImage | null>(null);

  const downloadImage = async (imageUrl: string, filename: string) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Failed to download image:', error);
    }
  };

  if (results.length === 0 && !isGenerating) {
    return (
      <Card className="p-8 text-center bg-ai-surface border-border">
        <div className="space-y-4">
          <div className="inline-flex p-3 rounded-full bg-ai-surface-elevated">
            <Sparkles className="w-8 h-8 text-muted-foreground" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              No images generated yet
            </h3>
            <p className="text-muted-foreground">
              Upload an image, preprocess it, and generate your first AI artwork!
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">
            Generated Images
          </h3>
          <p className="text-sm text-muted-foreground">
            {results.length} image{results.length !== 1 ? 's' : ''} generated
          </p>
        </div>
        {isGenerating && (
          <Badge variant="secondary" className="gap-2">
            <div className="w-3 h-3 border border-primary/30 border-t-primary rounded-full animate-spin" />
            Generating...
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {results.map((result, index) => (
          <Card key={index} className="group overflow-hidden bg-ai-surface border-border hover:shadow-card transition-all duration-300">
            <div className="relative aspect-square">
              <img
                src={result.imageURL}
                alt={result.positivePrompt}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-2">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="secondary" size="sm">
                      <Eye className="w-4 h-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl">
                    <DialogHeader>
                      <DialogTitle>Generated Image</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <img
                        src={result.imageURL}
                        alt={result.positivePrompt}
                        className="w-full rounded-lg"
                      />
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">
                          <strong>Prompt:</strong> {result.positivePrompt}
                        </p>
                        <div className="flex gap-4 text-xs text-muted-foreground">
                          <span>Seed: {result.seed}</span>
                          {result.cost && <span>Cost: ${result.cost.toFixed(4)}</span>}
                        </div>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => downloadImage(result.imageURL, `runware-${index + 1}.jpg`)}
                >
                  <Download className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="p-4 space-y-3">
              <p className="text-sm text-foreground line-clamp-2">
                {result.positivePrompt}
              </p>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Seed: {result.seed}
                </div>
                {result.cost && (
                  <div className="flex items-center gap-1">
                    <DollarSign className="w-3 h-3" />
                    ${result.cost.toFixed(4)}
                  </div>
                )}
              </div>
              {result.NSFWContent && (
                <Badge variant="destructive" className="text-xs">
                  NSFW Content Detected
                </Badge>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};