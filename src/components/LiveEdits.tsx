import React, { useState, useRef, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ImageUpload } from '@/components/ImageUpload';
import { Upload } from 'lucide-react';
import { toast } from 'sonner';
import { RunwareService } from '@/services/RunwareService';

interface LiveEditsProps {
  runwareService: RunwareService;
}

export const LiveEdits: React.FC<LiveEditsProps> = ({ runwareService }) => {
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string>("");
  const [segmentationImageUrl, setSegmentationImageUrl] = useState<string>("");
  const [selectedAreaImage, setSelectedAreaImage] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [hoveredSegment, setHoveredSegment] = useState<{x: number, y: number} | null>(null);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const segmentationImageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (uploadedImage) {
      const url = URL.createObjectURL(uploadedImage);
      setUploadedImageUrl(url);
      handlePreprocessSegmentation(uploadedImage);
      
      return () => URL.revokeObjectURL(url);
    }
  }, [uploadedImage]);

  useEffect(() => {
    if (uploadedImageUrl && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const img = new Image();
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
      };
      img.src = uploadedImageUrl;
    }
  }, [uploadedImageUrl]);

  useEffect(() => {
    if (segmentationImageUrl && overlayCanvasRef.current) {
      const canvas = overlayCanvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        segmentationImageRef.current = img;
      };
      img.src = segmentationImageUrl;
    }
  }, [segmentationImageUrl]);

  const handlePreprocessSegmentation = async (imageFile: File) => {
    setIsProcessing(true);
    try {
      const uploadedId = await runwareService.uploadImage(imageFile);
      
      const result = await runwareService.preprocessControlNet({
        inputImage: uploadedId,
        preProcessorType: 'seg',
        height: 1024,
        width: 1024,
        outputType: ['URL'],
        outputFormat: 'WEBP',
        includeCost: true
      });

      setSegmentationImageUrl(result.imageURL);
      toast.success('Segmentation preprocessing complete!');
    } catch (error) {
      console.error('Preprocessing failed:', error);
      toast.error('Failed to preprocess image');
    } finally {
      setIsProcessing(false);
    }
  };

  const getSegmentColor = (x: number, y: number): { r: number, g: number, b: number } | null => {
    if (!overlayCanvasRef.current || !segmentationImageRef.current) return null;
    
    const canvas = overlayCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Draw segmentation image to get pixel data
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(segmentationImageRef.current, 0, 0);
    
    const imageData = ctx.getImageData(x, y, 1, 1);
    const data = imageData.data;
    
    return { r: data[0], g: data[1], b: data[2] };
  };

  const highlightSegment = (x: number, y: number) => {
    if (!overlayCanvasRef.current || !segmentationImageRef.current) return;
    
    const canvas = overlayCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const segmentColor = getSegmentColor(x, y);
    if (!segmentColor) return;

    // Clear and redraw segmentation
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(segmentationImageRef.current, 0, 0);
    
    // Get all pixels and highlight matching segment
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    const highlightData = ctx.createImageData(canvas.width, canvas.height);
    const highlight = highlightData.data;
    
    const tolerance = 10;
    
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      
      if (
        Math.abs(r - segmentColor.r) < tolerance &&
        Math.abs(g - segmentColor.g) < tolerance &&
        Math.abs(b - segmentColor.b) < tolerance
      ) {
        highlight[i] = 0;     // Blue
        highlight[i + 1] = 100;
        highlight[i + 2] = 255;
        highlight[i + 3] = 128; // Semi-transparent
      }
    }
    
    ctx.putImageData(highlightData, 0, 0);
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!segmentationImageUrl) return;
    
    const canvas = e.currentTarget;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = Math.floor((e.clientX - rect.left) * scaleX);
    const y = Math.floor((e.clientY - rect.top) * scaleY);
    
    setHoveredSegment({ x, y });
    highlightSegment(x, y);
  };

  const handleCanvasMouseLeave = () => {
    setHoveredSegment(null);
    if (overlayCanvasRef.current) {
      const ctx = overlayCanvasRef.current.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, overlayCanvasRef.current.width, overlayCanvasRef.current.height);
      }
    }
  };

  const handleCanvasClick = async (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!segmentationImageUrl || !hoveredSegment) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const segmentColor = getSegmentColor(hoveredSegment.x, hoveredSegment.y);
    if (!segmentColor) return;

    // Create mask for selected segment
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = canvas.width;
    maskCanvas.height = canvas.height;
    const maskCtx = maskCanvas.getContext('2d');
    if (!maskCtx) return;

    // Draw segmentation to get pixel data
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx || !segmentationImageRef.current) return;
    
    tempCtx.drawImage(segmentationImageRef.current, 0, 0);
    const segData = tempCtx.getImageData(0, 0, canvas.width, canvas.height);
    
    // Create mask
    const maskData = maskCtx.createImageData(canvas.width, canvas.height);
    const tolerance = 10;
    
    for (let i = 0; i < segData.data.length; i += 4) {
      const r = segData.data[i];
      const g = segData.data[i + 1];
      const b = segData.data[i + 2];
      
      if (
        Math.abs(r - segmentColor.r) < tolerance &&
        Math.abs(g - segmentColor.g) < tolerance &&
        Math.abs(b - segmentColor.b) < tolerance
      ) {
        maskData.data[i] = 255;
        maskData.data[i + 1] = 255;
        maskData.data[i + 2] = 255;
        maskData.data[i + 3] = 255;
      }
    }
    
    maskCtx.putImageData(maskData, 0, 0);
    
    // Convert mask to blob and display
    maskCanvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        setSelectedAreaImage(url);
        toast.success('Segment selected!');
      }
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <Card className="p-6 bg-ai-surface border-border shadow-card">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Upload className="w-5 h-5" />
          Upload Image
        </h3>
        
        <ImageUpload
          onImageSelect={setUploadedImage}
          selectedImage={uploadedImage}
        />
        
        {isProcessing && (
          <div className="mt-4 text-center text-sm text-muted-foreground">
            Processing segmentation...
          </div>
        )}
        
        {uploadedImageUrl && (
          <div className="mt-6 relative">
            <h4 className="text-sm font-semibold mb-2">Interactive Canvas</h4>
            <p className="text-xs text-muted-foreground mb-3">
              Hover to highlight segments, click to select
            </p>
            <div className="relative inline-block">
              <canvas
                ref={canvasRef}
                className="max-w-full h-auto border border-border rounded"
              />
              <canvas
                ref={overlayCanvasRef}
                onMouseMove={handleCanvasMouseMove}
                onMouseLeave={handleCanvasMouseLeave}
                onClick={handleCanvasClick}
                className="absolute top-0 left-0 max-w-full h-auto cursor-pointer"
                style={{ opacity: 0 }}
              />
            </div>
          </div>
        )}
      </Card>

      <Card className="p-6 bg-ai-surface border-border shadow-card">
        <h3 className="text-lg font-semibold mb-4">Selected Segment</h3>
        
        {selectedAreaImage ? (
          <div className="space-y-4">
            <img
              src={selectedAreaImage}
              alt="Selected segment"
              className="w-full h-auto border border-border rounded"
            />
            <Button
              variant="outline"
              onClick={() => {
                const link = document.createElement('a');
                link.href = selectedAreaImage;
                link.download = 'selected-segment.png';
                link.click();
              }}
              className="w-full"
            >
              Download Segment
            </Button>
          </div>
        ) : (
          <div className="text-center py-16 text-muted-foreground">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-ai-surface-elevated flex items-center justify-center">
              <Upload className="w-8 h-8 opacity-50" />
            </div>
            <p>Upload an image and click on a segment to see it here</p>
          </div>
        )}
        
        <div className="mt-6 p-4 bg-ai-surface-elevated rounded-lg border border-border">
          <h4 className="text-sm font-semibold mb-2">How to use:</h4>
          <ol className="text-sm text-muted-foreground space-y-1 list-decimal pl-5">
            <li>Upload an image</li>
            <li>Wait for automatic segmentation</li>
            <li>Hover over the image to highlight segments</li>
            <li>Click to select and extract a segment</li>
          </ol>
        </div>
      </Card>
    </div>
  );
};
