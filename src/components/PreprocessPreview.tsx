import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, Download } from 'lucide-react';
import type { PreprocessedImage } from '@/services/RunwareService';

interface PreprocessPreviewProps {
  preprocessedImage: PreprocessedImage | null;
  originalImage: File | null;
}

export const PreprocessPreview = ({ preprocessedImage, originalImage }: PreprocessPreviewProps) => {
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

  if (!preprocessedImage || !originalImage) {
    return null;
  }

  return (
    <Card className="p-6 bg-ai-surface border-border shadow-card">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-foreground">
              Preprocessing Result
            </h3>
            <p className="text-sm text-muted-foreground">
              Your image has been processed and is ready for generation
            </p>
          </div>
          <Badge variant="secondary" className="gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            Ready
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Original Image */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-foreground">Original</h4>
              <Badge variant="outline">{originalImage.name}</Badge>
            </div>
            <div className="relative aspect-square rounded-lg overflow-hidden bg-ai-surface-elevated">
              <img
                src={URL.createObjectURL(originalImage)}
                alt="Original"
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          {/* Preprocessed Image */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-foreground">
                {preprocessedImage.preprocessor.charAt(0).toUpperCase() + 
                 preprocessedImage.preprocessor.slice(1)} Processed
              </h4>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => downloadImage(
                    preprocessedImage.imageURL, 
                    `${preprocessedImage.preprocessor}-processed.png`
                  )}
                >
                  <Download className="w-3 h-3" />
                </Button>
              </div>
            </div>
            <div className="relative aspect-square rounded-lg overflow-hidden bg-ai-surface-elevated">
              <img
                src={preprocessedImage.imageURL}
                alt={`${preprocessedImage.preprocessor} processed`}
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>

        <div className="p-4 bg-ai-surface-elevated rounded-lg border border-border">
          <p className="text-sm text-muted-foreground">
            <strong>Preprocessor:</strong> {preprocessedImage.preprocessor} • 
            <strong> Status:</strong> Ready for image generation • 
            <strong> Format:</strong> PNG
          </p>
        </div>
      </div>
    </Card>
  );
};